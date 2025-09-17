import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    // First try to find user by clerkUserId
    let loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    // If not found by clerkUserId, try to find by email (in case user exists but with different clerkUserId)
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      loggedInUser = await db.user.findUnique({
        where: {
          email: email,
        },
      });

      if (loggedInUser) {
        // Update the existing user with the new clerkUserId
        loggedInUser = await db.user.update({
          where: {
            id: loggedInUser.id,
          },
          data: {
            clerkUserId: user.id,
            name: `${user.firstName} ${user.lastName}`,
            imageUrl: user.imageUrl,
          },
        });
        return loggedInUser;
      }
    }

    // If user doesn't exist, create new user
    const name = `${user.firstName} ${user.lastName}`;
    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: email,
      },
    });

    return newUser;
  } catch (error) {
    console.error("Error in checkUser:", error.message);
    // Return null to prevent app crashes
    return null;
  }
};
