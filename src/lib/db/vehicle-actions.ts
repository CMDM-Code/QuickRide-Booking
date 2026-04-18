'use server';

import { revalidateTag } from 'next/cache';
import { db } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export async function getVehicles() {
  return db.select().from(schema.vehicles).all();
}

export async function getAvailableVehicles() {
  return db.select().from(schema.vehicles).where(eq(schema.vehicles.status, 'available')).all();
}

export async function createVehicle(data: schema.NewVehicle) {
  const result = await db.insert(schema.vehicles).values(data).returning().get();
  revalidateTag('vehicles', 'layout');
  return result;
}

export async function updateVehicle(id: string, data: Partial<schema.NewVehicle>) {
  const result = await db.update(schema.vehicles).set(data).where(eq(schema.vehicles.id, id)).returning().get();
  revalidateTag('vehicles', 'layout');
  return result;
}

export async function deleteVehicle(id: string) {
  await db.delete(schema.vehicles).where(eq(schema.vehicles.id, id)).run();
  revalidateTag('vehicles', 'layout');
}
