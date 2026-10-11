import { Redis } from '@upstash/redis';

let redisClient: Redis | undefined;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Web Push storage is not configured.');

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function getVapidConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error('Web Push VAPID keys are not configured.');
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(publicKey) || !/^[A-Za-z0-9_-]{40,60}$/.test(privateKey)) {
    throw new Error('The configured Web Push VAPID keys are invalid.');
  }
  if (!/^https:\/\/\S+$/.test(subject) && !/^mailto:\S+@\S+$/.test(subject)) {
    throw new Error('VAPID_SUBJECT must be an HTTPS URL or a mailto address.');
  }
  return { publicKey, privateKey, subject };
}

export const notificationKeys = {
  subscriptions: 'goal-pulse:{notifications}:subscriptions',
  goals: 'goal-pulse:{notifications}:subscriptions:goals',
  fullTime: 'goal-pulse:{notifications}:subscriptions:full-time',
  kickoffs: (minutes: number) => `goal-pulse:{notifications}:subscriptions:kickoffs:${minutes}`,
  snapshots: 'goal-pulse:{notifications}:match-snapshots',
  outbox: 'goal-pulse:{notifications}:outbox',
  lock: 'goal-pulse:{notifications}:job-lock',
  subscription: (id: string) => `goal-pulse:{notifications}:subscription:${id}`,
  processed: (id: string) => `goal-pulse:{notifications}:processed:${id}`,
  event: (id: string) => `goal-pulse:{notifications}:event:${id}`,
  delivered: (id: string) => `goal-pulse:{notifications}:delivered:${id}`,
  failed: (id: string) => `goal-pulse:{notifications}:failed:${id}`,
  rateLimit: (scope: string, addressHash: string, bucket: number) =>
    `goal-pulse:{notifications}:rate:${scope}:${addressHash}:${bucket}`
};
