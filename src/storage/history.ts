import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem } from '../types';

const HISTORY_KEY = 'av_cacao_history';

export class HistoryStorage {
  /**
   * Retrieves all history items, sorted by date descending.
   */
  static async getHistory(): Promise<HistoryItem[]> {
    try {
      const json = await AsyncStorage.getItem(HISTORY_KEY);
      if (!json) return [];
      const items: HistoryItem[] = JSON.parse(json);
      // Sort: newest first
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('[HistoryStorage] Error loading history:', e);
      return [];
    }
  }

  /**
   * Saves a new item to history.
   */
  static async addRecord(record: Omit<HistoryItem, 'id' | 'date'>): Promise<HistoryItem> {
    try {
      const items = await this.getHistory();
      const newRecord: HistoryItem = {
        ...record,
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
      };
      items.push(newRecord);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
      return newRecord;
    } catch (e) {
      console.error('[HistoryStorage] Error adding record:', e);
      throw e;
    }
  }

  /**
   * Deletes a record by ID.
   */
  static async deleteRecord(id: string): Promise<void> {
    try {
      let items = await this.getHistory();
      items = items.filter((item) => item.id !== id);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[HistoryStorage] Error deleting record:', e);
      throw e;
    }
  }

  /**
   * Clears all history.
   */
  static async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('[HistoryStorage] Error clearing history:', e);
      throw e;
    }
  }
}
export default HistoryStorage;
