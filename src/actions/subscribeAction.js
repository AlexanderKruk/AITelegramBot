import { Markup } from 'telegraf';
import { ERROR_MESSAGE } from '../constants.js';

export default async (ctx) => {
  try {
    await ctx.reply(
      `Enhance your speaking proficiency with FluentSpeak's Subscription✨

<b>What can you expect?</b>
🚀 Boost confidence: Build strong confidence in your communication abilities
💵 Cost-effective: 15 times more affordable than a traditional tutor
💬 Unlimited topics: Discuss any subject of your choice
🕑 24/7 availability: Practice whenever it suits you
📝 Instant grammar and pronunciation feedback: Improve right on the spot
☺️ Supportive environment: The AI teacher will always support you

Begin your English improvement journey now. Improve your communication skills starting today!`,
      {
        ...Markup.inlineKeyboard([
          Markup.button.url(
            'Subscribe Now',
            `https://fluent-speak.com/subscription/?telegram_id=${ctx.session.userData.from.id}`,
          ),
        ]),
        parse_mode: 'HTML',
      },
    );
  } catch (error) {
    console.error('subscribe error: ', error.message);
    await ctx.reply(ERROR_MESSAGE);
  }
};
