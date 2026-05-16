import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Image, Dimensions, FlatList, Modal } from 'react-native';
import { Colors } from '../../theme/colors';
import { ChevronLeft, Share2, Users, Receipt, CreditCard, UserPlus, QrCode, X } from 'lucide-react-native';
import { useGroupStore } from '../../store/useGroupStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const [showQRModal, setShowQRModal] = useState(false);
  
  const groups = useGroupStore((state) => state.groups);
  const group = groups.find(g => g.id === groupId);
  
  const allInvoices = useInvoiceStore((state) => state.invoices);
  const invoices = useMemo(() => 
    allInvoices.filter(inv => inv.groupId === groupId), 
    [allInvoices, groupId]
  );

  const totalSpent = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const userBalance = useMemo(() => {
    if (!group || !auth.currentUser) return 0;
    const userId = auth.currentUser.uid;
    const memberCount = group.members.length || 1;
    
    return invoices.reduce((balance, inv) => {
      const share = inv.amount / memberCount;
      if (inv.paidBy === userId) {
        return balance + (inv.amount - share);
      } else {
        return balance - share;
      }
    }, 0);
  }, [invoices, group, auth.currentUser]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'groups', groupId, 'invoices'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedInvoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate() || new Date(),
      })) as any[];
      
      // Update store with new invoices for this group
      // We should merge with existing invoices from other groups
      const otherGroupsInvoices = useInvoiceStore.getState().invoices.filter(inv => inv.groupId !== groupId);
      useInvoiceStore.getState().setInvoices([...fetchedInvoices, ...otherGroupsInvoices]);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (!group) return null;

  const onShare = async () => {
    try {
      await Share.share({
        message: `Tham gia nhóm SplitEZ "${group.name}" của mình bằng mã này: ${group.inviteCode}\nHoặc tải app SplitEZ để nhập mã!`,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const renderInvoiceItem = (invoice: any) => (
    <View key={invoice.id} style={styles.invoiceItem}>
      <View style={styles.invoiceIcon}>
        <Receipt color={Colors.primary} size={20} />
      </View>
      <View style={styles.invoiceInfo}>
        <Text style={styles.invoiceTitle}>{invoice.title}</Text>
        <Text style={styles.invoiceSubtitle}>Trả bởi {invoice.paidByName}</Text>
      </View>
      <Text style={styles.invoiceAmount}>{invoice.amount.toLocaleString()}đ</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <ChevronLeft color={Colors.dark.text} size={28} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          {group.imageUri && (
            <Image source={{ uri: group.imageUri }} style={styles.headerAvatar} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setShowQRModal(true)} style={styles.headerIconButton}>
            <QrCode color={Colors.dark.text} size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.headerIconButton}>
            <Share2 color={Colors.dark.text} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setShowQRModal(false)}
            >
              <X color={Colors.dark.textSecondary} size={24} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Quét mã để tham gia</Text>
            <Text style={styles.modalSubtitle}>Cho bạn bè quét mã này để tham gia nhóm {group.name}</Text>
            
            <View style={styles.modalQrWrapper}>
              <QRCode
                value={group.inviteCode}
                size={SCREEN_WIDTH * 0.6}
                color="#000000"
                backgroundColor="#FFFFFF"
                ecl="H"
              />
            </View>
            <Text style={styles.modalInviteCode}>{group.inviteCode}</Text>
          </View>
        </View>
      </Modal>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng chi tiêu</Text>
              <Text style={styles.summaryValue}>{totalSpent.toLocaleString()}đ</Text>
            </View>
            <View style={[styles.summaryItem, styles.borderLeft]}>
              <Text style={styles.summaryLabel}>Số dư của bạn</Text>
              <Text style={[
                styles.summaryValue, 
                { color: userBalance >= 0 ? Colors.success : Colors.danger }
              ]}>
                {userBalance > 0 ? '+' : ''}{userBalance.toLocaleString()}đ
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.debtButton}
            onPress={() => navigation.navigate('Debt Summary', { groupId })}
          >
            <CreditCard color={Colors.primary} size={18} />
            <Text style={styles.debtButtonText}>Báo cáo nợ & Thanh toán</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thành viên nhóm</Text>
            <TouchableOpacity style={styles.inviteButton} onPress={onShare}>
              <UserPlus color={Colors.primary} size={18} />
              <Text style={styles.inviteText}>Mời</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.membersList}>
            {group.members.map((member, index) => (
              <View key={index} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarText}>{member.substring(0, 1).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{member === 'me' ? 'Bạn' : member}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
          {invoices.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Receipt color={Colors.dark.textSecondary} size={40} />
              <Text style={styles.emptyActivityText}>Chưa có giao dịch nào</Text>
            </View>
          ) : (
            <View style={styles.invoiceList}>
              {invoices.map(renderInvoiceItem)}
            </View>
          )}
        </View>

        <View style={styles.qrSection}>
          <Text style={styles.inviteCodeLabel}>MÃ MỜI & QR CODE</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={group.inviteCode}
              size={SCREEN_WIDTH * 0.45}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="H"
            />
          </View>
          <Text style={styles.inviteCodeText}>{group.inviteCode}</Text>
          <Text style={styles.inviteCodeHelp}>Quét mã này để tham gia nhóm nhanh chóng</Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          console.log('Navigating to Add Invoice with groupId:', groupId);
          navigation.navigate('Add Invoice', { groupId });
        }}
      >
        <View style={styles.fabIcon}>
          <Receipt color="white" size={24} />
          <Text style={styles.fabText}>Thêm hóa đơn</Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    maxWidth: '80%',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  debtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  debtButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  inviteText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  memberItem: {
    alignItems: 'center',
    width: 65,
  },
  memberAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  memberName: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  invoiceList: {
    gap: 12,
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(36, 129, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  invoiceSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  invoiceAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyActivity: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emptyActivityText: {
    marginTop: 12,
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
  qrSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 10,
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
  },
  inviteCodeText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: Colors.dark.text,
    letterSpacing: 6,
    marginBottom: 10,
  },
  inviteCodeHelp: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 999,
  },
  fabIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  modalSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  modalQrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 20,
  },
  modalInviteCode: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  }
});
