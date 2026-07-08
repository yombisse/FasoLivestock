import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, Text } from 'react-native';
import { Modalize } from 'react-native-modalize';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import farmService from '../services/farm.service';
import { Farm } from '../types/farm.types';

export interface AppFarmPickerRef {
  present: () => void;
  dismiss: () => void;
}

interface AppFarmPickerProps<T = Farm> {
  onSelect: (item: T) => void;
  selectedId?: string;
  title?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  items?: T[];
  loading?: boolean;
  getItemLabel?: (item: T) => string;
  onOpen?: () => Promise<void> | void;
}

const AppFarmPicker = forwardRef<AppFarmPickerRef, AppFarmPickerProps<any>>(({
  onSelect,
  selectedId,
  title = 'Sélectionner une ferme',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucune donnée trouvée',
  items: itemsProp,
  loading: loadingProp = false,
  getItemLabel,
  onOpen,
}, ref) => {
  const modalizeRef = useRef<Modalize>(null);
  const [loading, setLoading] = useState(loadingProp);
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    present: () => open(),
    dismiss: () => modalizeRef.current?.close(),
  }));

  useEffect(() => {
    if (itemsProp) {
      setItems(itemsProp);
    }
  }, [itemsProp]);

  useEffect(() => {
    setLoading(loadingProp);
  }, [loadingProp]);

  const open = async () => {
    modalizeRef.current?.open();

    if (onOpen) {
      try {
        setLoading(true);
        await onOpen();
      } catch (err) {
        console.error('Error loading picker items:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (itemsProp) {
      setItems(itemsProp);
      return;
    }

    try {
      setLoading(true);
      const { getFarms } = await import('../database/repositories/farmRepository');
      const list = await getFarms();
      setItems(list);
    } catch (err) {
      console.error('Error loading farms:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    modalizeRef.current?.close();
    onSelect(item);
  };

  const getLabel = (item: any) => {
    if (typeof getItemLabel === 'function') {
      return getItemLabel(item);
    }
    return item?.name || item?.nom || item?.numero_identification || item?.id || '';
  };

  const filtered = items.filter((item) => getLabel(item).toLowerCase().includes(query.toLowerCase()));

  return (
    <Modalize
      ref={modalizeRef}
      adjustToContentHeight
      modalStyle={styles.modal}
      handleStyle={styles.indicator}
      keyboardAvoidingBehavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardAvoidingOffset={Platform.OS === 'android' ? 80 : 0}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={18} color="#757575" />
            <TextInput
              placeholder={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
              blurOnSubmit={false}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const label = getLabel(item);
                const itemTextStyle = item.id === selectedId ? [styles.itemLabel, styles.itemSelected] : styles.itemLabel;
                return (
                  <Pressable style={styles.item} onPress={() => handleSelect(item)}>
                    <Text style={itemTextStyle}>{label}</Text>
                    <MaterialCommunityIcons name={item.id === selectedId ? 'check' : 'chevron-right'} size={18} color={item.id === selectedId ? '#2E7D32' : '#BDBDBD'} />
                  </Pressable>
                );
              }}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.list}
              ListEmptyComponent={() => <Text style={[styles.empty, { color: '#757575' }]}>{emptyMessage}</Text>}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modalize>
  );
});

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
  container: {
    padding: 16,
    maxHeight: '70%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#212121',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
  },
  list: {
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemLabel: {
    fontSize: 16,
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  itemSelected: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 12,
  },
});

export default AppFarmPicker;
