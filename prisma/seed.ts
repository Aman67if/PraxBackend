import { PrismaClient, Role, Difficulty } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@praxes.in" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@praxes.in",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  const empPassword = await bcrypt.hash("Emp@123", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@praxes.in" },
    update: {},
    create: {
      name: "Test Employee",
      email: "employee@praxes.in",
      password: empPassword,
      role: Role.EMPLOYEE,
    },
  });
  console.log(`✅ Employee created: ${employee.email}`);

  const stuPassword = await bcrypt.hash("Student@123", 12);
  const student = await prisma.user.upsert({
    where: { email: "student@praxes.in" },
    update: {},
    create: {
      name: "Test Student",
      email: "student@praxes.in",
      password: stuPassword,
      role: Role.STUDENT,
      class_level: 10,
    },
  });
  console.log(`✅ Student created: ${student.email}`);

  const sampleQuestions = [
    {
      class_level: 10,
      subject: "Mathematics",
      chapter: "Algebra",
      topic: "Quadratic Equations",
      correct_option: 2,
      difficulty: Difficulty.MEDIUM,
      content: {
        question: { text: "Solve: $x^2 - 5x + 6 = 0$", image: null },
        options: [
          { text: "$x = 1, 6$", image: null },
          { text: "$x = 2, 4$", image: null },
          { text: "$x = 2, 3$", image: null },
          { text: "$x = 1, 5$", image: null },
        ],
        explanation: {
          text: "Factoring: $(x-2)(x-3) = 0$, so $x = 2$ or $x = 3$.",
          image: null,
        },
      },
    },
    {
      class_level: 10,
      subject: "Mathematics",
      chapter: "Algebra",
      topic: "Quadratic Equations",
      correct_option: 0,
      difficulty: Difficulty.EASY,
      content: {
        question: {
          text: "What is the discriminant of $2x^2 + 3x - 2$?",
          image: null,
        },
        options: [
          { text: "$25$", image: null },
          { text: "$-7$", image: null },
          { text: "$17$", image: null },
          { text: "$9$", image: null },
        ],
        explanation: {
          text: "Discriminant $= b^2 - 4ac = 9 - 4(2)(-2) = 9 + 16 = 25$.",
          image: null,
        },
      },
    },
    {
      class_level: 10,
      subject: "Physics",
      chapter: "Motion",
      topic: "Equations of Motion",
      correct_option: 1,
      difficulty: Difficulty.MEDIUM,
      content: {
        question: {
          text: "A body starts from rest and accelerates at $5\\ m/s^2$ for $4\\ s$. Find the distance covered.",
          image: null,
        },
        options: [
          { text: "$20\\ m$", image: null },
          { text: "$40\\ m$", image: null },
          { text: "$80\\ m$", image: null },
          { text: "$10\\ m$", image: null },
        ],
        explanation: {
          text: "Using $s = ut + \\frac{1}{2}at^2 = 0 + \\frac{1}{2}(5)(16) = 40\\ m$.",
          image: null,
        },
      },
    },
    {
      class_level: 10,
      subject: "Chemistry",
      chapter: "Periodic Table",
      topic: "Atomic Number",
      correct_option: 3,
      difficulty: Difficulty.EASY,
      content: {
        question: { text: "What is the atomic number of Carbon?", image: null },
        options: [
          { text: "$8$", image: null },
          { text: "$12$", image: null },
          { text: "$14$", image: null },
          { text: "$6$", image: null },
        ],
        explanation: {
          text: "Carbon (C) has atomic number 6, meaning it has 6 protons in its nucleus.",
          image: null,
        },
      },
    },
  ];

  for (const q of sampleQuestions) {
    await prisma.question.create({
      data: { ...q, content: q.content as any, created_by: employee.id },
    });
  }

  console.log(`✅ ${sampleQuestions.length} sample questions seeded.`);
  console.log("\n🎉 Seeding complete!\n");
  console.log("Login credentials:");
  console.log("  Admin    → admin@praxes.in     / Admin@123");
  console.log("  Employee → employee@praxes.in  / Emp@123");
  console.log("  Student  → student@praxes.in   / Student@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
