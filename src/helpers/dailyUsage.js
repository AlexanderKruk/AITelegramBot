import dayjs from 'dayjs';
import { Markup } from 'telegraf';

export default async (ctx) => {
  const currentDate = dayjs().format('DD.MM.YYYY');
  if (ctx.session.userData.premium) {
    if (ctx.session.userData.lastPremiumDate !== currentDate) {
      ctx.session.userData.monthCost += ctx.session.userData.dayCost;
      ctx.session.userData.dailyCost.push(ctx.session.userData.dayCost);
      ctx.session.userData.dayCost = 0;
      ctx.session.userData.dayFreeFeedback = 0;
      if (
        ctx.session.userData.lastPremiumDate &&
        ctx.session.userData.lastPremiumDate.split('.')[1] !== currentDate.split('.')[1]
      ) {
        ctx.session.userData.monthCost = 0;
        ctx.session.userData.dailyCost = [];
      }
      ctx.session.userData.lastPremiumDate = currentDate;
    }
    if (ctx.session.userData.dayCost > ctx.session.settings.maxDayPaidCost) {
      await ctx.reply(
        "🎉 You've had a great practice!\nLooking forward to seeing you tomorrow 🤗",
        ctx.session.userData.dayFreeFeedback >= ctx.session.settings.maxDayFreeFeedback
          ? Markup.inlineKeyboard([])
          : Markup.inlineKeyboard([Markup.button.callback(`Get feedback`, 'finishAndFeedback')]),
      );
      return true;
    }
  } else {
    if (ctx.session.userData.lastTrialDate !== currentDate) {
      ctx.session.userData.lastTrialDate = currentDate;
      ctx.session.userData.trialDays += 1;
      ctx.session.userData.monthCost += ctx.session.userData.dayCost;
      ctx.session.userData.dailyCost.push(ctx.session.userData.dayCost);
      ctx.session.userData.dayCost = 0;
      ctx.session.userData.dayFreeFeedback = 0;
    }
    if (ctx.session.userData.trialDays >= ctx.session.settings.maxDaysTrial) {
      await ctx.reply(
        'Your three-day trial is over 😌\nTo continue learning, please subscribe 🤗',
        Markup.inlineKeyboard([
          Markup.button.url(
            'Subscribe Now',
            `https://fluent-speak.com/subscription/?telegram_id=${ctx.session.userData.from.id}`,
          ),
        ]),
      );
      return true;
    }
    if (ctx.session.userData.dayCost > ctx.session.settings.maxDayFreeCost) {
      await ctx.reply(
        "🎉 You've had a great practice!\nThe next free lesson will be available tomorrow, or you can purchase a subscription 🤗",
        ctx.session.userData.dayFreeFeedback >= ctx.session.settings.maxDayFreeFeedback
          ? Markup.inlineKeyboard([
              Markup.button.url(
                'Subscribe Now',
                `https://fluent-speak.com/subscription/?telegram_id=${ctx.session.userData.from.id}`,
              ),
            ])
          : Markup.inlineKeyboard([
              [
                Markup.button.callback(`Free feedback`, 'finishAndFeedback'),
                Markup.button.url(
                  'Subscribe Now',
                  `https://fluent-speak.com/subscription/?telegram_id=${ctx.session.userData.from.id}`,
                ),
              ],
            ]),
      );
      return true;
    }
  }
};
