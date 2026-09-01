/**
 * Family data context (PRD R7): the whole graph arrives once per session
 * via snapshot listeners — after the first delivery every navigation is a
 * synchronous in-memory lookup, and admin edits appear live for everyone
 * without a refresh.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase-data';
import type { FamilyData, Person, Union } from '../types/family';

type DataState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; data: FamilyData };

const DataCtx = createContext<DataState>({ phase: 'loading' });
export const useFamilyData = () => useContext(DataCtx);

/** For components rendered only behind the ready gate. */
export function useReadyData(): FamilyData {
  const state = useContext(DataCtx);
  if (state.phase !== 'ready') throw new Error('Family data not ready');
  return state.data;
}

export function FamilyDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ phase: 'loading' });

  useEffect(() => {
    let meta: { family: FamilyData['family']; rootUnion: string } | undefined;
    let people: Record<string, Person> | undefined;
    let unions: Record<string, Union> | undefined;

    const publish = () => {
      if (meta && people && unions) {
        setState({
          phase: 'ready',
          data: { family: meta.family, rootUnion: meta.rootUnion, people, unions },
        });
      }
    };
    const fail = (e: unknown) =>
      setState({
        phase: 'error',
        message: e instanceof Error ? e.message : 'Could not load the family',
      });

    getDoc(doc(db, 'meta', 'family'))
      .then((snap) => {
        const d = snap.data();
        if (!d)
          throw new Error(
            'no family data yet — an admin needs to run `npm run seed` (see the README)',
          );
        meta = d as typeof meta;
        publish();
      })
      .catch(fail);

    const offPeople = onSnapshot(
      collection(db, 'people'),
      (snap) => {
        const next: Record<string, Person> = {};
        snap.forEach((d) => (next[d.id] = d.data() as Person));
        people = next;
        publish();
      },
      fail,
    );
    const offUnions = onSnapshot(
      collection(db, 'unions'),
      (snap) => {
        const next: Record<string, Union> = {};
        snap.forEach((d) => (next[d.id] = d.data() as Union));
        unions = next;
        publish();
      },
      fail,
    );

    return () => {
      offPeople();
      offUnions();
    };
  }, []);

  return <DataCtx.Provider value={state}>{children}</DataCtx.Provider>;
}
