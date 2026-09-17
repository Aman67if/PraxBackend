import prisma from "./src/config/prisma";
async function test() {
  try {
    const user = await prisma.user.findFirst();
    console.log("Success", user);
  } catch(e) {
    console.error("Error", e);
  }
}
test();
