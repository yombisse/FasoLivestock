import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ListItemCard from './ListItemCard';
import { getTransactionColor } from '../../config/colors';
import { Transaction } from '../../types/transaction.types';

export interface TransactionListItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

const TransactionListItem: React.FC<TransactionListItemProps> = ({ transaction, onPress }) => {
  const getTransactionIcon = (type?: string, categorie?: string) => {
    // More specific icons based on category
    if (categorie === 'VENTE_ANIMAL') return 'tag';
    if (categorie === 'ACHAT_ANIMAL') return 'cash';
    if (categorie === 'ALIMENTATION') return 'food';
    if (categorie === 'SANTE') return 'medical-bag';
    if (categorie === 'REPRODUCTION') return 'heart-pulse';
    
    // Fallback to type-based icons
    switch (type) {
      case 'ENTREE':
        return 'arrow-down-left';
      case 'SORTIE':
        return 'arrow-up-right';
      case 'TRANSFERT':
        return 'swap-horizontal';
      case 'AJUSTEMENT':
        return 'cog';
      default:
        return 'help-circle';
    }
  };

  const getTransactionLabel = (categorie?: string, description?: string) => {
    if (categorie === 'VENTE_ANIMAL') return 'Vente d\'animal';
    if (categorie === 'ACHAT_ANIMAL') return 'Achat d\'animal';
    if (categorie === 'ALIMENTATION') return 'Alimentation';
    if (categorie === 'SANTE') return 'Santé';
    if (categorie === 'REPRODUCTION') return 'Reproduction';
    return description || 'Transaction';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const colors = getTransactionColor(transaction.type_transaction);
  const icon = getTransactionIcon(transaction.type_transaction, transaction.categorie_id);
  const label = getTransactionLabel(transaction.categorie_id, transaction.description);

  const rightContent = (
    <View style={styles.amountContainer}>
      <AppText style={[styles.amount, { color: colors.text }]} fontWeight="bold">
        {transaction.type_transaction === 'ENTREE' ? '+' : '-'}{formatAmount(transaction.montant)}
      </AppText>
    </View>
  );

  const footer = (
    <View style={styles.footerContent}>
      <AppText style={styles.footerDate} color="#757575" fontSize={12}>
        {formatDate(transaction.date_transaction)}
      </AppText>
      {transaction.tiers && (
        <>
          < AppText style={styles.footerSeparator} color="#9E9E9E" fontSize={12}>
            •
          </AppText>
          <AppText style={styles.footerTiers} color="#9E9E9E" fontSize={12}>
            {transaction.tiers}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <ListItemCard
      icon={icon}
      iconColor={colors.text}
      iconBackgroundColor={`${colors.text}20`}
      title={label}
      footer={footer}
      rightContent={rightContent}
      onPress={() => onPress?.(transaction)}
      accessibilityLabel={`Transaction ${label}, montant ${formatAmount(transaction.montant)}`}
    />
  );
};

const styles = StyleSheet.create({
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDate: {
    fontSize: 12,
  },
  footerSeparator: {
    marginHorizontal: 4,
  },
  footerTiers: {
    fontSize: 12,
  },
});

export default TransactionListItem;
