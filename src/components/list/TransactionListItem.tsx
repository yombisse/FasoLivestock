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

  const getTransactionLabel = (transaction: Transaction) => {
    // Use animal name as title if available
    if ((transaction as any).animal_nom) {
      return (transaction as any).animal_nom;
    }
    // Fallback to category or description
    if (transaction.categorie_id === 'VENTE_ANIMAL') return 'Vente d\'animal';
    if (transaction.categorie_id === 'ACHAT_ANIMAL') return 'Achat d\'animal';
    if (transaction.categorie_id === 'ALIMENTATION') return 'Alimentation';
    if (transaction.categorie_id === 'SANTE') return 'Santé';
    if (transaction.categorie_id === 'REPRODUCTION') return 'Reproduction';
    return transaction.description || 'Transaction';
  };

  const getTransactionSubtitle = (transaction: Transaction) => {
    // Show type only as subtitle
    const typeLabel = transaction.type_transaction === 'ENTREE' ? 'Vente' :
                     transaction.type_transaction === 'SORTIE' ? 'Achat' :
                     transaction.type_transaction === 'TRANSFERT' ? 'Transfert' :
                     transaction.type_transaction || 'Transaction';
    return typeLabel;
  };

  const formatAmount = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '0 XOF';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date inconnue';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Date invalide';
    }
  };

  const colors = getTransactionColor(transaction.type_transaction);
  const icon = getTransactionIcon(transaction.type_transaction, transaction.categorie_id);
  const label = getTransactionLabel(transaction);
  const subtitle = getTransactionSubtitle(transaction);

  const rightContent = (
    <View style={styles.amountContainer}>
      <AppText style={[styles.amount, { color: colors.text }]} fontWeight="bold">
        {transaction.type_transaction === 'ENTREE' ? '+' : '-'}{formatAmount(transaction.montant)}
      </AppText>
    </View>
  );

  const footer = (
    <View style={styles.footerContent}>
      <AppText style={styles.footerSubtitle} color="#757575" fontSize={12}>
        {subtitle}
      </AppText>
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
  footerSubtitle: {
    fontSize: 12,
  },
});

export default TransactionListItem;
