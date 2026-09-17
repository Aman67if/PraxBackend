import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export async function listUsers(role?: Role, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, class_level: true, is_active: true, created_at: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function createEmployee(data: {
  name: string; email?: string; phone?: string; password: string;
}) {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use.', 409);
  }
  if (data.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) throw new AppError('Phone number already in use.', 409);
  }
  const hashed = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: { ...data, password: hashed, role: Role.EMPLOYEE },
    select: { id: true, name: true, email: true, phone: true, role: true, created_at: true },
  });
}

export async function updateEmployee(
  id: number,
  data: { name?: string; email?: string; phone?: string; password?: string }
) {
  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee || employee.role !== Role.EMPLOYEE) {
    throw new AppError('Employee not found.', 404);
  }
  if (data.email && data.email !== employee.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use by another account.', 409);
  }
  if (data.phone && data.phone !== employee.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) throw new AppError('Phone number already in use by another account.', 409);
  }

  const hashedPassword = data.password ? await bcrypt.hash(data.password, 12) : undefined;

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name      && { name:     data.name     }),
      ...(data.email     && { email:    data.email    }),
      ...(data.phone     && { phone:    data.phone    }),
      ...(hashedPassword && { password: hashedPassword }),
    },
    select: { id: true, name: true, email: true, phone: true, role: true, is_active: true },
  });
}

export async function deleteEmployee(id: number) {
  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee || employee.role !== Role.EMPLOYEE) {
    throw new AppError('Employee not found.', 404);
  }
  return prisma.user.delete({ where: { id } });
}

export async function toggleUserActive(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);
  return prisma.user.update({
    where: { id: userId },
    data: { is_active: !user.is_active },
    select: { id: true, name: true, is_active: true },
  });
}

export async function getPlatformMetrics() {
  const [totalStudents, totalEmployees, totalQuestions] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT,  is_active: true } }),
      prisma.user.count({ where: { role: Role.EMPLOYEE, is_active: true } }),
      prisma.question.count({ where: { is_active: true } }),
    ]);

  return {
    total_students:  totalStudents,
    total_employees: totalEmployees,
    total_questions: totalQuestions,
  };
}

// ── Per-employee question metrics ──────────────────────────────────────────────
export async function getEmployeeMetrics() {
  // Get all active employees
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE, is_active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  // Date boundaries
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch counts in parallel for all employees
  const metrics = await Promise.all(
    employees.map(async (emp) => {
      const [today, month, total] = await Promise.all([
        prisma.question.count({
          where: {
            created_by: emp.id,
            is_active: true,
            created_at: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.question.count({
          where: {
            created_by: emp.id,
            is_active: true,
            created_at: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.question.count({
          where: { created_by: emp.id, is_active: true },
        }),
      ]);

      return {
        id:    emp.id,
        name:  emp.name,
        email: emp.email,
        today,
        month,
        total,
      };
    })
  );

  // Sort by most questions today, then month
  return metrics.sort((a, b) => b.today - a.today || b.month - a.month);
}