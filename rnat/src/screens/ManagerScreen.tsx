import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert, RefreshControl,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { Shield, FileText, CheckCircle, XCircle, AlertTriangle } from 'react-native-feather';

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  report_type: string;
  reason: string;
  status: string;
  created_at: string;
}

const ReportItem = ({ report, onApprove, onReject }: { report: Report; onApprove: () => void; onReject: () => void; }) => (
  <View style={styles.reportCard}>
    <View style={styles.reportHeader}>
      <View style={styles.reportType}>
        <AlertTriangle width={16} height={16} color={Colors.error} />
        <Text style={styles.reportTypeText}>{report.report_type.toUpperCase()}</Text>
      </View>
      <Text style={styles.reportDate}>{new Date(report.created_at).toLocaleDateString()}</Text>
    </View>
    
    <Text style={styles.reportReason}>{report.reason}</Text>
    
    <View style={styles.reportMeta}>
      <Text style={styles.reportMetaLabel}>Content:</Text>
      <Text style={styles.reportMetaValue}>{report.content_type} ({report.content_id.slice(0, 8)}...)</Text>
    </View>
    
    <View style={styles.reportActions}>
      <TouchableOpacity onPress={onReject} style={[styles.actionBtn, styles.rejectBtn]}>
        <XCircle width={16} height={16} color={Colors.error} />
        <Text style={styles.actionBtnText}>Reject</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onApprove} style={[styles.actionBtn, styles.approveBtn]}>
        <CheckCircle width={16} height={16} color="#10B981" />
        <Text style={styles.actionBtnText}>Approve</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function ManagerScreen({ navigation }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0, resolved: 0 });

  const loadReports = async () => {
    try {
      // TODO: Implement actual API calls
      // const res = await fetch('/api/reports/pending');
      // Mock data for now
      setReports([
        {
          id: '1',
          content_type: 'beat',
          content_id: 'abc123',
          report_type: 'plagiarism',
          reason: 'This beat uses my copyrighted material without permission',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);
      setStats({ pending: 1, reviewed: 0, resolved: 0 });
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
  };

  const handleApprove = (id: string) => {
    Alert.alert('Approve Report', 'Take action on this content?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Content', style: 'destructive' },
      { text: 'Warn User' },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Reject Report', 'Mark this report as invalid?');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Shield width={28} height={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>Manager Dashboard</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.reviewed}</Text>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        {/* Reports */}
        <Text style={styles.sectionTitle}>Pending Reports</Text>
        
        {reports.length === 0 ? (
          <View style={styles.empty}>
            <FileText width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No pending reports</Text>
            <Text style={styles.emptySub}>All caught up!</Text>
          </View>
        ) : (
          reports.map(report => (
            <ReportItem
              key={report.id}
              report={report}
              onApprove={() => handleApprove(report.id)}
              onReject={() => handleReject(report.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 52,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  headerTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
  },
  scrollContent: { padding: Spacing['2xl'] },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  reportTypeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.error,
  },
  reportDate: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  reportReason: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  reportMetaLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  reportMetaValue: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  approveBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  actionBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyText: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySub: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
