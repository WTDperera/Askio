import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'askio-backend',
  name: 'Askio Backend',
  eventKey: process.env.INNGEST_EVENT_KEY || 'dev',
});
