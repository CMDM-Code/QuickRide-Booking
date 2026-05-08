import { db } from "./firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  getCountFromServer,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { withTimeout } from "./api-utils";
import { subDays } from "date-fns";
import { getSecurityLogs } from "./admin-store";

export interface DashboardStats {
  totalRevenue: number;
  activeUsers: number;
  activeRentals: number;
  totalBookings: number;
  revenueChange: string;
  usersChange: string;
  rentalsChange: string;
  bookingsChange: string;
}

export async function fetchGlobalStats(): Promise<DashboardStats> {
  if (!db) return getLocalStats();

  try {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // Current State Queries
    const bookingsCol = collection(db, 'bookings');
    const profilesCol = collection(db, 'profiles');

    const totalRevenueQuery = query(bookingsCol, where('status', '!=', 'cancelled'));
    const activeRentalsQuery = query(bookingsCol, where('status', '==', 'active'));

    // Percentages (simplified MoM: last 30d vs 30d before)
    const currentPeriodBookingsQuery = query(bookingsCol, where('created_at', '>=', Timestamp.fromDate(thirtyDaysAgo)));
    const previousPeriodBookingsQuery = query(bookingsCol, 
        where('created_at', '>=', Timestamp.fromDate(sixtyDaysAgo)),
        where('created_at', '<', Timestamp.fromDate(thirtyDaysAgo))
    );
    
    const currentPeriodUsersQuery = query(profilesCol, where('created_at', '>=', Timestamp.fromDate(thirtyDaysAgo)));
    const previousPeriodUsersQuery = query(profilesCol, 
        where('created_at', '>=', Timestamp.fromDate(sixtyDaysAgo)),
        where('created_at', '<', Timestamp.fromDate(thirtyDaysAgo))
    );

    const [
      revSnap, usersCount, rentalsCount, bookingsCount,
      currBksSnap, prevBksSnap, currUsrCount, prevUsrCount
    ] = await withTimeout(
      Promise.all([
        getDocs(totalRevenueQuery),
        getCountFromServer(profilesCol),
        getCountFromServer(activeRentalsQuery),
        getCountFromServer(bookingsCol),
        getDocs(currentPeriodBookingsQuery),
        getDocs(previousPeriodBookingsQuery),
        getCountFromServer(currentPeriodUsersQuery),
        getCountFromServer(previousPeriodUsersQuery)
      ]),
      5000
    );

    const totalRevenue = revSnap.docs.reduce((sum, d) => sum + parseFloat(d.data().total_price || 0), 0);
    
    // Revenue Percentages
    const currRev = currBksSnap.docs.reduce((sum, d) => sum + parseFloat(d.data().total_price || 0), 0);
    const prevRev = prevBksSnap.docs.reduce((sum, d) => sum + parseFloat(d.data().total_price || 0), 0);
    
    const calculatePct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    return {
      totalRevenue,
      activeUsers: usersCount.data().count,
      activeRentals: rentalsCount.data().count,
      totalBookings: bookingsCount.data().count,
      revenueChange: calculatePct(currRev, prevRev),
      usersChange: calculatePct(currUsrCount.data().count, prevUsrCount.data().count),
      rentalsChange: calculatePct(rentalsCount.data().count, 0),
      bookingsChange: calculatePct(currBksSnap.size, prevBksSnap.size),
    };
  } catch (err) {
    console.warn("Cloud stats fetch failed, using Local Mode stats:", err);
    return getLocalStats();
  }
}

function getLocalStats(): DashboardStats {
  // A5: No longer use adminStore (localStorage is removed)
  // Return default stats - Firestore should be queried in production
  return {
    totalRevenue: 0,
    activeUsers: 0,
    activeRentals: 0,
    totalBookings: 0,
    revenueChange: '—',
    usersChange: '—',
    rentalsChange: '—',
    bookingsChange: '—',
  };
}

export async function fetchRecentActivity() {
    const firestore = db;
    if (!firestore) return [];

    try {
      const q = query(collection(firestore, 'bookings'), orderBy('created_at', 'desc'), limit(8));
      const snap = await withTimeout(getDocs(q), 3000) as any;

      const activities = await Promise.all(snap.docs.map(async (docRef) => {
          const b = docRef.data();
          let userName = 'Guest Customer';
          
          if (b.user_id) {
              try {
                  const profileSnap = await getDoc(doc(firestore, 'profiles', b.user_id));
                  if (profileSnap.exists()) {
                      userName = profileSnap.data().full_name || profileSnap.data().email || userName;
                  }
              } catch (e) {
                  console.warn("Could not fetch profile for activity:", b.user_id);
              }
          }

        const createdAt = b.created_at instanceof Timestamp ? b.created_at.toDate() : new Date(b.created_at);

        return {
            action: `Booking ${b.status.toUpperCase()}`,
            user: userName,
            time: createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            status: b.status
        };
    }));

    return activities;
  } catch (err) {
    console.warn("Cloud activity fetch failed:", err);
    const logs = await getSecurityLogs();
    return logs.slice(0, 8).map(log => ({
      action: log.action_type,
      user: log.actor_name || log.actor_id || 'System',
      time: new Date(log.timestamp).toLocaleTimeString()
    }));
  }
}
