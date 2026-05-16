import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image, TextInput, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { QrCode, Search, Users, MessageSquarePlus, Archive } from 'lucide-react-native';
import { useGroupStore } from '../../store/useGroupStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function GroupListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { groups, setGroups } = useGroupStore();
  const allInvoices = useInvoiceStore((state) => state.invoices);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Tất cả');

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as any[];
      
      // Sort by createdAt descending locally
      fetchedGroups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setGroups(fetchedGroups);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const tabs = ['Tất cả', 'Cá nhân', 'Nhóm'];

  // Logic lọc danh sách dựa trên tìm kiếm và tab
  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      // Lọc theo từ khóa tìm kiếm
      const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase());
      
      // Lọc theo tab
      if (activeTab === 'Cá nhân') {
        return matchesSearch && group.members.length === 1;
      }
      if (activeTab === 'Nhóm') {
        return matchesSearch && group.members.length > 1;
      }
      
      return matchesSearch;
    });
  }, [groups, search, activeTab]);

  const renderGroupItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('Group Detail', { groupId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Users color="white" size={24} />
          </View>
        )}
      </View>
      
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.chatTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            Tổng chi tiêu: {
              allInvoices
                .filter(inv => inv.groupId === item.id)
                .reduce((sum, inv) => sum + inv.amount, 0)
                .toLocaleString()
            }đ
          </Text>
          {item.members.length > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.members.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* SPLITEZ Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SPLITEZ</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Scan QR')}>
          <QrCode color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color={Colors.dark.textSecondary} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm chat"
            placeholderTextColor={Colors.dark.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {tab === 'Tất cả' && groups.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{groups.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {search ? 'Không tìm thấy kết quả' : 'Chưa có cuộc hội thoại nào'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Hãy thử từ khóa khác' : 'Nhấn nút bên dưới để tạo nhóm mới'}
            </Text>
          </View>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 20 }]}
        onPress={() => navigation.navigate('Create Group')}
      >
        <MessageSquarePlus color="white" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface,
  },
  headerIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  tabContainer: {
    backgroundColor: Colors.dark.surface,
    paddingTop: 8,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 30, // Tăng khoảng cách giữa các tab
  },
  tabItem: {
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabBadge: {
    backgroundColor: Colors.dark.textSecondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: Colors.dark.surface,
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderAvatar: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  chatTime: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.dark.textSecondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  archiveItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  archiveIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  archiveContent: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 12,
  },
  archiveTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  archiveSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});
