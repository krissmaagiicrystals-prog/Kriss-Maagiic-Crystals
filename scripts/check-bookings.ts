import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import dns from 'dns';
if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB.');

  const latestBookings = await Booking.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log('--- LATEST 5 BOOKINGS ---');
  latestBookings.forEach((b: any) => {
    console.log(`Booking Number: ${b.bookingNumber}`);
    console.log(`Service ID: ${b.service}`);
    console.log(`Service Title: ${b.serviceTitle}`);
    console.log(`Service Price: ${b.servicePrice}`);
    console.log(`Status: ${b.status}`);
    console.log(`Payment Status: ${b.paymentStatus}`);
    console.log(`Customer Name: ${b.customer?.name}`);
    console.log(`Customer Email: ${b.customer?.email}`);
    console.log('---------------------');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
