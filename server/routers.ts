import { COOKIE_NAME } from "../shared/const.js";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chapmanGuide: router({
    ask: publicProcedure
      .input(z.object({ message: z.string().trim().min(1).max(700) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 360,
          messages: [
            {
              role: "system",
              content: "You are Chapman AI Guide for Chapman Prestige Limited in Kumasi, Ghana. Explain laundry, deep cleaning, fumigation, car detailing, sofa and carpet cleaning, polytank sanitization, contract cleaning, bookings, dates, payments, and rewards in plain English. Do not promise availability, quotes, dates, discounts, live tracking, or human actions. If a customer needs a final price, date confirmation, complaint, payment issue, or urgent help, direct them to Chapman Admin or Contact Us in the app. Keep answers warm, practical, and under 100 words.",
            },
            { role: "user", content: input.message },
          ],
        });
        const content = response.choices[0]?.message?.content;
        const reply = typeof content === "string" ? content.trim() : "";
        return { reply: reply || "I could not prepare a reply just now. Please try again or contact Chapman Admin." };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
