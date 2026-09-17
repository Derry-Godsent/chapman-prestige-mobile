import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { fetchLaundryItems, formatGhs, type LaundryItem } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { haptic } from "@/lib/haptics";

type ServiceType = "wash" | "iron" | "fold" | "hang";

const quickBaskets = [
  { label: "Work-week refresh", detail: "5 shirts · 2 trousers", items: [{ id: "shirt", quantity: 5, service: "wash" as ServiceType }, { id: "trousers", quantity: 2, service: "wash" as ServiceType }] },
  { label: "Linen refresh", detail: "2 bedsheets · 4 pillowcases", items: [{ id: "bedsheet", quantity: 2, service: "wash" as ServiceType }, { id: "pillowcase", quantity: 4, service: "wash" as ServiceType }] },
];

export default function LaundryBookingScreen() {
  const { cart, express, setExpress, updateLaundryQuantity, cartCount, laundrySubtotal, expressFee } = useBookingStore();
  const [items, setItems] = useState<LaundryItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks which service type is selected for each item ID
  const [selectedServices, setSelectedServices] = useState<Record<string, ServiceType>>({});

  useEffect(() => {
    fetchLaundryItems().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const quantityFor = (id: string) => cart.find((line) => line.item.id === id)?.quantity ?? 0;
  
  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, LaundryItem[]>>((groups, item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
      return groups;
    }, {});
  }, [items]);

  // Calculate total based on the actual selected services in the cart
  const calculateTotal = () => {
    let itemsTotal = 0;
    cart.forEach(line => {
      // We use the price stored in the item object (which we override in handleQuantityChange)
      itemsTotal += Number(line.item.price_wash || 0) * line.quantity;
    });
    const expressFeeCalc = express ? cartCount * 10 : 0;
    const pickupFee = cartCount > 0 ? 20 : 0;
    return itemsTotal + expressFeeCalc + pickupFee;
  };

  const total = calculateTotal();

  const handleServiceSelect = (itemId: string, service: ServiceType) => {
    haptic.selection();
    setSelectedServices(prev => ({ ...prev, [itemId]: service }));
    // If they change the service while items are in the cart, we could reset quantity, 
    // but for smooth UX we'll just let them adjust.
  };

  const handleQuantityChange = (item: LaundryItem, delta: number) => {
    haptic.selection();
    const currentQty = quantityFor(item.id);
    const newQty = currentQty + delta;
    
    if (newQty < 0) return;

    const selectedService = selectedServices[item.id] || "wash";
    let priceToUse = item.price_wash || 0;

    // Override the price_wash property with the selected service's price 
    // so the store and database calculations work perfectly without breaking.
    if (selectedService === "iron") priceToUse = item.price_iron || 0;
    if (selectedService === "fold") priceToUse = item.price_fold || 0;
    if (selectedService === "hang") priceToUse = item.price_hang || 0;

    const itemForCart = { ...item, price_wash: priceToUse };
    updateLaundryQuantity(itemForCart, newQty);
  };

  const applyBasket = (basketItems: { id: string; quantity: number; service: ServiceType }[]) => {
    haptic.medium();
    basketItems.forEach(({ id, quantity, service }) => {
      const item = items.find((candidate) => candidate.id === id);
      if (item) {
        setSelectedServices(prev => ({ ...prev, [id]: service }));
        let priceToUse = item.price_wash || 0;
        if (service === "iron") priceToUse = item.price_iron || 0;
        if (service === "fold") priceToUse = item.price_fold || 0;
        if (service === "hang") priceToUse = item.price_hang || 0;
        
        const itemForCart = { ...item, price_wash: priceToUse };
        updateLaundryQuantity(itemForCart, quantity);
      }
    });
  };

  const getServicePrice = (item: LaundryItem, service: ServiceType) => {
    if (service === "iron") return item.price_iron;
    if (service === "fold") return item.price_fold;
    if (service === "hang") return item.price_hang;
    return item.price_wash;
  };

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.blue} />
          <Text style={styles.loadingText}>Loading laundry list...</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader title="Build your laundry" subtitle="Transparent per-item pricing" />
          
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="shirt-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.introCopy}>
              <DisplayText style={styles.introTitle}>What are we caring for?</DisplayText>
              <BodyText style={styles.introBody}>Select the service for each item.</BodyText>
            </View>
          </View>

          <View style={styles.quickStart}>
            <View style={styles.quickStartHeader}>
              <View>
                <Text style={styles.quickStartLabel}>QUICK START</Text>
                <Text style={styles.quickStartTitle}>Add a common basket</Text>
              </View>
              <Ionicons name="sparkles-outline" size={20} color={palette.blue} />
            </View>
            <View style={styles.basketRow}>
              {quickBaskets.map((basket) => (
                <TouchableOpacity 
                  key={basket.label} 
                  activeOpacity={0.78} 
                  onPress={() => applyBasket(basket.items)} 
                  style={styles.basket}
                >
                  <Text style={styles.basketTitle}>{basket.label}</Text>
                  <Text style={styles.basketDetail}>{basket.detail}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <View key={category} style={styles.category}>
              <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
              <View style={styles.itemList}>
                {categoryItems.map((item) => {
                  const quantity = quantityFor(item.id);
                  const selectedService = selectedServices[item.id] || "wash";
                  const currentPrice = getServicePrice(item, selectedService);

                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {/* Service Selection Buttons */}
                        <View style={styles.serviceButtons}>
                          {item.price_wash !== null && (
                            <TouchableOpacity 
                              onPress={() => handleServiceSelect(item.id, "wash")}
                              style={[styles.serviceBtn, selectedService === "wash" && styles.serviceBtnActive]}
                            >
                              <Text style={[styles.serviceBtnText, selectedService === "wash" && styles.serviceBtnTextActive]}>Wash</Text>
                            </TouchableOpacity>
                          )}
                          {item.price_iron !== null && (
                            <TouchableOpacity 
                              onPress={() => handleServiceSelect(item.id, "iron")}
                              style={[styles.serviceBtn, selectedService === "iron" && styles.serviceBtnActive]}
                            >
                              <Text style={[styles.serviceBtnText, selectedService === "iron" && styles.serviceBtnTextActive]}>Iron</Text>
                            </TouchableOpacity>
                          )}
                          {item.price_fold !== null && (
                            <TouchableOpacity 
                              onPress={() => handleServiceSelect(item.id, "fold")}
                              style={[styles.serviceBtn, selectedService === "fold" && styles.serviceBtnActive]}
                            >
                              <Text style={[styles.serviceBtnText, selectedService === "fold" && styles.serviceBtnTextActive]}>Fold</Text>
                            </TouchableOpacity>
                          )}
                          {item.price_hang !== null && (
                            <TouchableOpacity 
                              onPress={() => handleServiceSelect(item.id, "hang")}
                              style={[styles.serviceBtn, selectedService === "hang" && styles.serviceBtnActive]}
                            >
                              <Text style={[styles.serviceBtnText, selectedService === "hang" && styles.serviceBtnTextActive]}>Hang</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.itemPrice}>{formatGhs(currentPrice || 0)} each</Text>
                      </View>
                      
                      <View style={styles.stepper}>
                        <TouchableOpacity 
                          disabled={quantity === 0} 
                          onPress={() => handleQuantityChange(item, -1)} 
                          style={[styles.stepperButton, quantity === 0 && styles.stepperDisabled]}
                        >
                          <Ionicons name="remove" size={17} color={quantity === 0 ? "#B6BAC6" : palette.blue} />
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{quantity}</Text>
                        <TouchableOpacity 
                          onPress={() => handleQuantityChange(item, 1)} 
                          style={styles.stepperButton}
                        >
                          <Ionicons name="add" size={17} color={palette.blue} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.expressCard}>
            <View style={styles.expressIcon}>
              <Ionicons name="flash" size={20} color={palette.orange} />
            </View>
            <View style={styles.expressCopy}>
              <Text style={styles.expressTitle}>Express care</Text>
              <Text style={styles.expressMeta}>Priority turnaround · ₵10 per item</Text>
            </View>
            <Switch 
              value={express} 
              onValueChange={(value) => { haptic.medium(); setExpress(value); }} 
              trackColor={{ false: "#D8DBE4", true: "#FFBE92" }} 
              thumbColor={express ? palette.orange : "#FFFFFF"} 
            />
          </View>
        </ScrollView>

        <View style={styles.summary}>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>{cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} selected` : "Select items to continue"}</Text>
            <Text style={styles.summaryTotal}>{cartCount ? formatGhs(total) : "0"}</Text>
          </View>
          <PrimaryButton 
            label="Review booking" 
            icon="arrow-forward" 
            disabled={!cartCount} 
            onPress={() => router.push("/checkout" as never)} 
            style={styles.summaryButton} 
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.canvas },
  loadingText: { marginTop: 10, color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 14 },
  page: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: 20, paddingTop: 12, paddingBottom: 110, gap: 17 },
  intro: { padding: 16, borderRadius: 21, backgroundColor: "#003EC7", flexDirection: "row", gap: 12, alignItems: "center" },
  introIcon: { width: 47, height: 47, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  introCopy: { flex: 1, gap: 4 },
  introTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 26 },
  introBody: { color: "#DDE1FF", fontSize: 12, lineHeight: 17 },
  quickStart: { padding: 15, borderRadius: 19, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 11 },
  quickStartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quickStartLabel: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 },
  quickStartTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 3 },
  basketRow: { flexDirection: "row", gap: 8 },
  basket: { flex: 1, minHeight: 63, padding: 10, borderRadius: 14, backgroundColor: "#EEF3FF", justifyContent: "center", gap: 3 },
  basketTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 11 },
  basketDetail: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9, lineHeight: 13 },
  category: { gap: 8 },
  categoryTitle: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1, paddingHorizontal: 2 },
  itemList: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, borderRadius: 18, overflow: "hidden" },
  itemRow: { minHeight: 95, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#EEF0F4" },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  serviceButtons: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  serviceBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "#F1F2F5", borderWidth: 1, borderColor: "transparent" },
  serviceBtnActive: { backgroundColor: "#EEF2FF", borderColor: palette.blue },
  serviceBtnText: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10 },
  serviceBtnTextActive: { color: palette.blue, fontFamily: "Inter_700Bold" },
  itemPrice: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  stepperDisabled: { backgroundColor: "#F1F2F5" },
  quantity: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14, minWidth: 15, textAlign: "center" },
  expressCard: { padding: 14, borderRadius: 18, backgroundColor: "#FFF5F0", borderWidth: 1, borderColor: "#FFE1D1", flexDirection: "row", alignItems: "center", gap: 10 },
  expressIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#FFF0E8", alignItems: "center", justifyContent: "center" },
  expressCopy: { flex: 1, gap: 2 },
  expressTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 },
  expressMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11 },
  summary: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 15, paddingHorizontal: 20, paddingBottom: 18, flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border },
  summaryText: { flex: 1, gap: 2 },
  summaryLabel: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 11 },
  summaryTotal: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 19 },
  summaryButton: { minWidth: 164 }
});