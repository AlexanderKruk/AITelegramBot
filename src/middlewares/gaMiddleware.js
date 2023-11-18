import TelegrafGA4 from 'telegraf-ga4';
import config from 'config';

const ga4 = new TelegrafGA4({
  measurement_id: config.get('GA_MEASUREMENT_ID'),
  api_secret: config.get('GA_API_SECRET'),
  client_id: config.get('GA_API_CLIENT_ID'),
});

export default ga4;
