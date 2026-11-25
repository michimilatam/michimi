import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui";
import { c, s } from "@/lib/theme";

type Row = { id: string; buyer_id: string; listing: { title: string } | null; buyer: { display_name: string } | null; seller: { display_name: string } | null };

export default function Mensajes() {
  const { user } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  useFocusEffect(useCallback(() => {
    if (!user) return;
    supabase.from("conversations")
      .select("id,buyer_id,listing:listings(title),buyer:profiles!conversations_buyer_id_fkey(display_name),seller:profiles!conversations_seller_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  }, [user]));

  if (!user) return <View style={[s.screen, s.pad]}><Button title="Ingresar para ver mensajes" onPress={() => router.push("/ingresar")} /></View>;
  return (
    <FlatList
      style={s.screen}
      data={rows}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<Text style={[s.soft, { padding: 16 }]}>Cuando consultes o hagas una oferta, la conversación aparece acá.</Text>}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/mensajes/${item.id}`)} style={{ padding: 16, backgroundColor: c.card }}>
          <Text style={s.h2}>{item.listing?.title}</Text>
          <Text style={s.soft}>{item.buyer_id === user.id ? `Vende ${item.seller?.display_name}` : `Interesado: ${item.buyer?.display_name}`}</Text>
        </Pressable>
      )}
    />
  );
}
