import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/auth';
import prisma from '../config/prisma';
import { initiateTransaction, verifyTransaction } from '../config/paytm';
import { AppError } from '../utils/AppError';
import { subscribeToPlan } from '../services/subscriptionPlan.service';

const router = Router();

// ─── Initiate payment ─────────────────────────────────────────────────────────
router.post('/initiate', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plan_id } = req.body;
    const userId = req.user!.userId;

    if (!plan_id) return next(new AppError('plan_id is required.', 400));

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: plan_id } });
    if (!plan || !plan.is_active) {
      return next(new AppError('Plan not found or inactive.', 404));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found.', 404));

    // Check if already subscribed
    const existing = await prisma.subscription.findFirst({
      where: { student_id: userId, plan_id, is_active: true, end_date: { gt: new Date() } },
    });
    if (existing) return next(new AppError('You already have an active subscription to this plan.', 400));

    // Calculate effective price
    const hasOffer = plan.offer_price != null && plan.offer_end_date != null && plan.offer_end_date > new Date();
    const amount = hasOffer ? plan.offer_price! : plan.price;

    const orderId = `PRAXES_${userId}_${Date.now()}`;

    // Create payment record — store plan_id so callback can activate subscription
    await prisma.payment.create({
      data: {
        student_id: userId,
        plan_id,
        amount,
        paytm_order_id: orderId,
        status: 'PENDING',
      },
    });

    const txnData = await initiateTransaction({
      orderId,
      amount,
      customerId: String(userId),
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
    });

    res.json({ status: 'success', data: { ...txnData, plan_id } });
  } catch (err) { next(err); }
});

// ─── Payment callback (called by Paytm after payment) ────────────────────────
// import fs from 'fs';
// import path from 'path';

router.post('/callback', async (req: Request, res: Response) => {
  const frontendUrl = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  try {
    // Debug log to see exactly what Paytm sends back
    // fs.writeFileSync(path.join(__dirname, '../../paytm-callback.json'), JSON.stringify(req.body, null, 2));

    let result;
    try {
      result = await verifyTransaction(req.body);
    } catch (verifyErr: any) {
      console.error('Paytm checksum verification failed:', verifyErr.message);
      return res.redirect(`${frontendUrl}/student/subscription?payment=failed&reason=checksum`);
    }

    if (!result.isValid) {
      console.warn('Paytm invalid checksum for orderId:', result.orderId);
      return res.redirect(`${frontendUrl}/student/subscription?payment=failed&reason=invalid`);
    }

    const payment = await prisma.payment.findUnique({
      where: { paytm_order_id: result.orderId },
    });

    if (!payment) {
      return res.redirect(`${frontendUrl}/student/subscription?payment=failed&reason=not_found`);
    }

    if (result.isSuccess) {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paytm_txn_id: result.txnId, status: 'SUCCESS' },
      });

      // Activate subscription using plan_id stored on payment record
      try {
        const subscription = await subscribeToPlan(payment.student_id, payment.plan_id);
        await prisma.payment.update({
          where: { id: payment.id },
          data: { subscription_id: subscription.id },
        });
      } catch (subErr: any) {
        console.error('Subscription activation error:', subErr.message);
      }

      return res.redirect(`${frontendUrl}/student/subscription?payment=success`);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paytm_txn_id: result.txnId, status: 'FAILED' },
      });
      return res.redirect(`${frontendUrl}/student/subscription?payment=failed`);
    }
  } catch (err: any) {
    console.error('Payment callback error:', err.message);
    return res.redirect(`${frontendUrl}/student/subscription?payment=failed`);
  }
});

// ─── Check payment status ─────────────────────────────────────────────────────
router.get('/status/:orderId', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { paytm_order_id: req.params.orderId },
    });

    if (!payment) return next(new AppError('Payment not found.', 404));
    if (payment.student_id !== req.user!.userId) return next(new AppError('Access denied.', 403));

    res.json({ status: 'success', data: payment });
  } catch (err) { next(err); }
});

export default router;
