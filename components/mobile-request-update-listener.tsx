import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { showLiveServiceUpdate } from "@/lib/chapman-notifications";
import { getStaffRequestUpdateNotice } from "@/lib/mobile-request-updates";
import { supabase } from "@/lib/supabase";
import { palette } from "@/components/chapman-ui";

type LiveRequestRow = { id: string; request_status: "pending" | "under_review" | "needs_customer_confirmation" | "confirmed" | "declined" | "cancelled" | "converted" };

/** Watches only the signed-in customer’s request rows while the app is open. */
export function MobileRequestUpdateListener() {
  const knownStatuses = useRef(new Map<string, LiveRequestRow["request_status"]>());
  const clearNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<{ title: string; body: string; requestId: string } | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let channel: ReturnType<typeof client.channel> | null = null;
    let active = true;

    const stop = () => {
      if (channel) void client.removeChannel(channel);
      channel = null;
      knownStatuses.current.clear();
    };

    const start = async () => {
      stop();
      const { data: sessionData } = await client.auth.getSession();
      const customerId = sessionData.session?.user.id;
      if (!active || !customerId) return;

      const { data } = await client.from("mobile_requests").select("id, request_status").eq("service_code", "laundry");
      if (!active) return;
      for (const request of (data ?? []) as LiveRequestRow[]) knownStatuses.current.set(request.id, request.request_status);

      channel = client.channel(`customer-mobile-request-updates-${customerId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobile_requests", filter: `customer_account_id=eq.${customerId}` }, (payload) => {
          const updated = payload.new as LiveRequestRow;
          const previousStatus = knownStatuses.current.get(updated.id);
          knownStatuses.current.set(updated.id, updated.request_status);
          if (previousStatus === updated.request_status) return;
          const updateNotice = getStaffRequestUpdateNotice(updated.request_status);
          if (!updateNotice) return;
          setNotice({ ...updateNotice, requestId: updated.id });
          if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current);
          clearNoticeTimer.current = setTimeout(() => setNotice(null), 8000);
          void showLiveServiceUpdate(updateNotice, updated.id);
        })
        .subscribe();
    };

    void start();
    const { data: authSubscription } = client.auth.onAuthStateChange(() => { void start(); });
    return () => { active = false; authSubscription.subscription.unsubscribe(); stop(); if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current); };
  }, []);

  if (!notice) return null;
  return <View pointerEvents="box-none" style={styles.overlay}><TouchableOpacity activeOpacity={0.9} style={styles.notice} onPress={() => { setNotice(null); router.push(`/booking/${notice.requestId}` as never); }}><View style={styles.icon}><Ionicons name="notifications" size={18} color="#FFFFFF" /></View><View style={styles.copy}><Text style={styles.title}>{notice.title}</Text><Text style={styles.body}>{notice.body}</Text></View><Ionicons name="chevron-forward" size={18} color="#FFFFFF" /></TouchableOpacity></View>;
}

const styles = StyleSheet.create({ overlay: { position: "absolute", top: 56, left: 14, right: 14, zIndex: 100, elevation: 100 }, notice: { minHeight: 66, padding: 11, borderRadius: 17, backgroundColor: palette.green, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#1C1208", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }, icon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, copy: { flex: 1, gap: 2 }, title: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, body: { color: "#E7FFF4", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 } });
