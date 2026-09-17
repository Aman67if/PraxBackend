export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function catchAsync(fn: (...args: any[]) => Promise<any>) {
  return (...args: any[]) => {
    const next = args[args.length - 1];
    fn(...args).catch(next);
  };
}
