declare var Package: any
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { useReducer, useEffect, useRef, useMemo, DependencyList } from 'react';

// Warns if data is a Mongo.Cursor or a POJO containing a Mongo.Cursor.
function checkCursor (data: any): void {
  let shouldWarn = false;
  if (Package.mongo && Package.mongo.Mongo && data && typeof data === 'object') {
    if (data instanceof Package.mongo.Mongo.Cursor) {
      shouldWarn = true;
    } else if (Object.getPrototypeOf(data) === Object.prototype) {
      Object.keys(data).forEach((key) => {
        if (data[key] instanceof Package.mongo.Mongo.Cursor) {
          shouldWarn = true;
        }
      });
    }
  }
  if (shouldWarn) {
    console.warn(
      'Warning: your reactive function is returning a Mongo cursor. '
      + 'This value will not be reactive. You probably want to call '
      + '`.fetch()` on the cursor before returning it.'
    );
  }
}

// Used to create a forceUpdate from useReducer. Forces update by
// incrementing a number whenever the dispatch method is invoked.
const fur = (x: number): number => x + 1;
const useForceUpdate = () => useReducer(fur, 0)[1];

export interface IReactiveFn<T> {
  (c?: Tracker.Computation): T
}

export interface ISkipUpdate<T> {
  <T>(prev: T, next: T): boolean
}

type TrackerRefs = {
  computation?: Tracker.Computation;
  isMounted: boolean;
  trackerData: any;
}

const useTrackerNoDeps = <T = any>(reactiveFn: IReactiveFn<T>, skipUpdate: ISkipUpdate<T> = null) => {
  const { current: refs } = useRef<TrackerRefs>({
    isMounted: false,
    trackerData: null
  });
  const forceUpdate = useForceUpdate();

  // Without deps, always dispose and recreate the computation with every render.
  if (refs.computation) {
    refs.computation.stop();
    // @ts-ignore This makes TS think ref.computation is "never" set
    delete refs.computation;
  }

  // Use Tracker.nonreactive in case we are inside a Tracker Computation.
  // This can happen if someone calls `ReactDOM.render` inside a Computation.
  // In that case, we want to opt out of the normal behavior of nested
  // Computations, where if the outer one is invalidated or stopped,
  // it stops the inner one.
  Tracker.nonreactive(() => Tracker.autorun((c: Tracker.Computation) => {
    refs.computation = c;
    if (c.firstRun) {
      // Always run the reactiveFn on firstRun
      refs.trackerData = reactiveFn(c);
    } else if (!skipUpdate || !skipUpdate(refs.trackerData, reactiveFn(c))) {
      // For any reactive change, forceUpdate and let the next render rebuild the computation.
      forceUpdate();
    }
  }));

  // To avoid creating side effects in render with Tracker when not using deps
  // create the computation, run the user's reactive function in a computation synchronously,
  // then immediately dispose of it. It'll be recreated again after the render is committed.
  if (!refs.isMounted) {
    // We want to forceUpdate in useEffect to support StrictMode.
    // See: https://github.com/meteor/react-packages/issues/278
    if (refs.computation) {
      refs.computation.stop();
      delete refs.computation;
    }
  }

  useEffect(() => {
    // Let subsequent renders know we are mounted (render is committed).
    refs.isMounted = true;

    // Render is committed. Since useTracker without deps always runs synchronously,
    // forceUpdate and let the next render recreate the computation.
    if (!skipUpdate) {
      forceUpdate();
    } else {
      Tracker.nonreactive(() => Tracker.autorun((c: Tracker.Computation) => {
        refs.computation = c;
        if (!skipUpdate(refs.trackerData, reactiveFn(c))) {
          // For any reactive change, forceUpdate and let the next render rebuild the computation.
          forceUpdate();
        }
      }));
    }

    // stop the computation on unmount
    return () =>{
      refs.computation?.stop();
    }
  }, []);

  return refs.trackerData;
}

const useTrackerWithDeps = <T = any>(reactiveFn: IReactiveFn<T>, deps: DependencyList, skipUpdate: ISkipUpdate<T> = null): T => {
  const forceUpdate = useForceUpdate();

  const { current: refs } = useRef<{
    reactiveFn: IReactiveFn<T>;
    data?: T;
    comp?: Tracker.Computation;
  }>({ reactiveFn });

  // keep reactiveFn ref fresh
  refs.reactiveFn = reactiveFn;

  useMemo(() => {
    // To jive with the lifecycle interplay between Tracker/Subscribe, run the
    // reactive function in a computation, then stop it, to force flush cycle.
    const comp = Tracker.nonreactive(
      () => Tracker.autorun((c: Tracker.Computation) => {
        refs.data = refs.reactiveFn();
      })
    );
    // In some cases, the useEffect hook will run before Meteor.defer, such as
    // when React.lazy is used. This will allow it to be stopped earlier in
    // useEffect if needed.
    refs.comp = comp;
    // To avoid creating side effects in render, stop the computation immediately
    Meteor.defer(() => {
      if (refs.comp) {
        refs.comp.stop();
        delete refs.comp;
      }
    });
  }, deps);

  useEffect(() => {
    if (refs.comp) {
      refs.comp.stop();
      delete refs.comp;
    }
    const computation = Tracker.nonreactive(
      () => Tracker.autorun((c) => {
        const data: T = refs.reactiveFn(c);
        if (!skipUpdate || !skipUpdate(refs.data, data)) {
          refs.data = data;
          forceUpdate();
        }
      })
    );
    return () => {
      computation.stop();
    };
  }, deps);

  return refs.data as T;
};

function useTrackerClient <T = any>(reactiveFn: IReactiveFn<T>, skipUpdate?: ISkipUpdate<T>): T;
function useTrackerClient <T = any>(reactiveFn: IReactiveFn<T>, deps?: DependencyList, skipUpdate?: ISkipUpdate<T>): T;
function useTrackerClient <T = any>(reactiveFn: IReactiveFn<T>, deps: DependencyList | ISkipUpdate<T> = null, skipUpdate: ISkipUpdate<T> = null): T {
  if (deps === null || deps === undefined || !Array.isArray(deps)) {
    if (typeof deps === "function") {
      skipUpdate = deps;
    }
    return useTrackerNoDeps(reactiveFn, skipUpdate);
  } else {
    return useTrackerWithDeps(reactiveFn, deps, skipUpdate);
  }
}

const useTrackerServer: typeof useTrackerClient = (reactiveFn) => {
  return Tracker.nonreactive(reactiveFn);
}

// When rendering on the server, we don't want to use the Tracker.
// We only do the first rendering on the server so we can get the data right away
const useTracker = Meteor.isServer
  ? useTrackerServer
  : useTrackerClient;

function useTrackerDev (reactiveFn, deps = null, skipUpdate = null) {
  function warn (expects: string, pos: string, arg: string, type: string) {
    console.warn(
      `Warning: useTracker expected a ${expects} in it\'s ${pos} argument `
        + `(${arg}), but got type of \`${type}\`.`
    );
  }

  if (typeof reactiveFn !== 'function') {
    warn("function", "1st", "reactiveFn", reactiveFn);
  }

  if (deps && skipUpdate && !Array.isArray(deps) && typeof skipUpdate === "function") {
    warn("array & function", "2nd and 3rd", "deps, skipUpdate",
      `${typeof deps} & ${typeof skipUpdate}`);
  } else {
    if (deps && !Array.isArray(deps) && typeof deps !== "function") {
      warn("array or function", "2nd", "deps or skipUpdate", typeof deps);
    }
    if (skipUpdate && typeof skipUpdate !== "function") {
      warn("function", "3rd", "skipUpdate", typeof skipUpdate);
    }
  }

  const data = useTracker(reactiveFn, deps, skipUpdate);
  checkCursor(data);
  return data;
}

export default Meteor.isDevelopment
  ? useTrackerDev as typeof useTrackerClient
  : useTracker;
