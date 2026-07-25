import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modalize } from 'react-native-modalize';
import AppText from './AppText';
import AppButton from './AppButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface EventDetailModalRef {
  present: () => void;
  dismiss: () => void;
}

interface EventDetailModalProps {
  event: {
    type_nom?: string;
    categorie?: string;
    date_evenement?: string;
    date_transaction?: string;
    description?: string;
    cout?: number;
    montant?: number;
    type_transaction?: string;
    animal_nom?: string;
    animal_numero?: string;
    id?: string;
    metadonnees?: Record<string, any>;
  };
}

const EventDetailModal = forwardRef<EventDetailModalRef, EventDetailModalProps>(
  ({ event }, ref) => {
    const modalizeRef = useRef<Modalize>(null);

    useImperativeHandle(ref, () => ({
      present: () => modalizeRef.current?.open(),
      dismiss: () => modalizeRef.current?.close(),
    }));

    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getEventDate = () => {
      return event.date_evenement || event.date_transaction;
    };

    const getEventAmount = () => {
      return event.cout || event.montant;
    };

    const renderMetadata = () => {
      if (!event.metadonnees || Object.keys(event.metadonnees).length === 0) {
        return null;
      }

      const metadataLabels: Record<string, string> = {
        nom_vaccin: 'Nom du vaccin',
        veterinaire: 'Vétérinaire',
        lot: 'Lot',
        date_prochaine: 'Date de rappel',
        medicament: 'Médicament',
        dosage: 'Dosage',
        duree: 'Durée',
        symptomes: 'Symptômes',
        diagnostic: 'Diagnostic',
        gravite: 'Gravité',
        type_controle: 'Type de contrôle',
        resultat: 'Résultat',
      };

      const entries = Object.entries(event.metadonnees).filter(([_, value]) => value !== null && value !== undefined && value !== '');

      if (entries.length === 0) return null;

      const formatMetadataValue = (key: string, value: any): string => {
        // Handle date formatting
        if (key === 'date_prochaine' && value) {
          return formatDate(value);
        }

        // Handle arrays - join with commas
        if (Array.isArray(value)) {
          return value.map((item) => {
            if (typeof item === 'object' && item !== null) {
              return item.nom || item.name || item.libelle || item.label || JSON.stringify(item);
            }
            return String(item);
          }).join(', ');
        }

        // Handle objects - extract meaningful info
        if (typeof value === 'object' && value !== null) {
          // If it's a simple object with known structure, extract meaningful info
          if (value.nom) return value.nom;
          if (value.name) return value.name;
          if (value.libelle) return value.libelle;
          if (value.label) return value.label;
          if (value.id) return value.id;
          if (value.value) return value.value;
          
          // For objects with multiple properties, create a readable string
          const entries = Object.entries(value)
            .filter(([k, v]) => v !== null && v !== undefined && typeof v !== 'object')
            .map(([k, v]) => `${k}: ${v}`);
          
          if (entries.length > 0) {
            return entries.join(', ');
          }
          
          // Otherwise skip complex objects
          return '';
        }

        // Handle strings, numbers, booleans
        return String(value);
      };

      return (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
            Détails supplémentaires
          </AppText>
          <View style={styles.card}>
            {entries.map(([key, value]) => {
              const formattedValue = formatMetadataValue(key, value);
              if (!formattedValue) return null; // Skip empty or complex objects

              return (
                <View key={key} style={styles.metadataRow}>
                  <AppText style={styles.metadataLabel} color="#757575" fontSize={13}>
                    {metadataLabels[key] || key}
                  </AppText>
                  <AppText style={styles.metadataValue} fontWeight="500" fontSize={14}>
                    {formattedValue}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        modalStyle={styles.modal}
        handleStyle={styles.indicator}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="information"
                size={28}
                color="#1976D2"
              />
            </View>
            <View style={styles.titleContainer}>
              <AppText style={styles.title} fontWeight="bold" fontSize={18}>
                {event.type_nom || event.categorie || 'Détails'}
              </AppText>
              <AppText style={styles.subtitle} color="#757575" fontSize={12}>
                Informations détaillées
              </AppText>
            </View>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.section}>
              <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                Type d'événement
              </AppText>
              <View style={styles.card}>
                <AppText style={styles.cardValue} fontWeight="600" fontSize={16}>
                  {event.type_nom || event.categorie || 'N/A'}
                </AppText>
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                Date
              </AppText>
              <View style={styles.card}>
                <AppText style={styles.cardValue} fontSize={16}>
                  {getEventDate() ? formatDate(getEventDate()) : 'N/A'}
                </AppText>
              </View>
            </View>

            {event.animal_nom && (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                  Animal
                </AppText>
                <View style={styles.card}>
                  <AppText style={styles.cardValue} fontWeight="600" fontSize={16}>
                    {event.animal_nom}
                  </AppText>
                  {event.animal_numero && (
                    <AppText style={styles.cardSubtext} color="#757575" fontSize={14}>
                      N° {event.animal_numero}
                    </AppText>
                  )}
                </View>
              </View>
            )}

            {event.description && (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                  Description
                </AppText>
                <View style={styles.card}>
                  <AppText style={styles.cardValue} fontSize={16}>
                    {event.description}
                  </AppText>
                </View>
              </View>
            )}

            {renderMetadata()}

            {getEventAmount() && (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                  Montant
                </AppText>
                <View style={[styles.card, styles.amountCard]}>
                  <AppText style={styles.amountValue} fontWeight="bold" fontSize={20}>
                    {formatAmount(getEventAmount() || 0)}
                  </AppText>
                </View>
              </View>
            )}

            {event.type_transaction && (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                  Type de transaction
                </AppText>
                <View style={styles.card}>
                  <View style={[
                    styles.badge,
                    { backgroundColor: event.type_transaction === 'ENTREE' ? '#E8F5E9' : '#FFEBEE' }
                  ]}>
                    <AppText style={[
                      styles.badgeText,
                      { color: event.type_transaction === 'ENTREE' ? '#2E7D32' : '#D32F2F' }
                    ]} fontWeight="bold">
                      {event.type_transaction}
                    </AppText>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} fontWeight="600" color="#757575">
                Identifiant
              </AppText>
              <View style={styles.card}>
                <AppText style={styles.cardValue} fontSize={12} color="#9E9E9E">
                  {event.id || 'N/A'}
                </AppText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              title="Fermer"
              onPress={() => modalizeRef.current?.close()}
              style={styles.closeButton}
            />
          </View>
        </View>
      </Modalize>
    );
  }
);

const styles = StyleSheet.create({
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  indicator: {
    backgroundColor: '#E0E0E0',
    width: 40,
    height: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    marginTop: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  cardValue: {
    fontSize: 16,
  },
  cardSubtext: {
    marginTop: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  metadataLabel: {
    width: 140,
  },
  metadataValue: {
    flex: 1,
    textAlign: 'right',
  },
  amountCard: {
    backgroundColor: '#E8F5E9',
  },
  amountValue: {
    color: '#2E7D32',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  closeButton: {
    backgroundColor: '#D32F2F',
  },
});

export default EventDetailModal;
