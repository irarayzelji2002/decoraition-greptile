import React, { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./AuthContext.js";
import useFirestoreSnapshots from "../hooks/useFirestoreSnapshots";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import Loading from "../components/Loading.jsx";

const SharedPropsContext = createContext();

const initialState = {
  users: [],
  projects: [],
  designs: [],
  designVersions: [],
  comments: [],
  notifications: [],
  projectBudgets: [],
  budgets: [],
  items: [],
  planMaps: [],
  pins: [],
  timelines: [],
  events: [],
  userProjects: [],
  userDesigns: [],
  userDesignVersions: [],
  userDesignsComments: [],
  userComments: [],
  userNotifications: [],
  userProjectBudgets: [],
  userBudgets: [],
  userItems: [],
  userPlanMaps: [],
  userPins: [],
  userTimelines: [],
  userEvents: [],
};

export function SharedPropsProvider({ children }) {
  const { user, setUser, userDoc, setUserDoc, handleLogout, loading, setLoading } = useAuth() || {};

  const [state, setState] = useState(initialState);

  const setUsers = (users) => setState((prev) => ({ ...prev, users }));
  const setProjects = (projects) => setState((prev) => ({ ...prev, projects }));
  const setDesigns = (designs) => setState((prev) => ({ ...prev, designs }));
  const setDesignVersions = (designVersions) => setState((prev) => ({ ...prev, designVersions }));
  const setComments = (comments) => setState((prev) => ({ ...prev, comments }));
  const setNotifications = (notifications) => setState((prev) => ({ ...prev, notifications }));
  const setProjectBudgets = (projectBudgets) => setState((prev) => ({ ...prev, projectBudgets }));
  const setBudgets = (budgets) => setState((prev) => ({ ...prev, budgets }));
  const setItems = (items) => setState((prev) => ({ ...prev, items }));
  const setPlanMaps = (planMaps) => setState((prev) => ({ ...prev, planMaps }));
  const setPins = (pins) => setState((prev) => ({ ...prev, pins }));
  const setTimelines = (timelines) => setState((prev) => ({ ...prev, timelines }));
  const setEvents = (events) => setState((prev) => ({ ...prev, events }));
  const setUserProjects = (userProjects) => setState((prev) => ({ ...prev, userProjects }));
  const setUserDesigns = (userDesigns) => setState((prev) => ({ ...prev, userDesigns }));
  const setUserDesignVersions = (userDesignVersions) =>
    setState((prev) => ({ ...prev, userDesignVersions }));
  const setUserDesignsComments = (userDesignsComments) =>
    setState((prev) => ({ ...prev, userDesignsComments }));
  const setUserComments = (userComments) => setState((prev) => ({ ...prev, userComments }));
  const setUserNotifications = (userNotifications) =>
    setState((prev) => ({ ...prev, userNotifications }));
  const setUserProjectBudgets = (userProjectBudgets) =>
    setState((prev) => ({ ...prev, userProjectBudgets }));
  const setUserBudgets = (userBudgets) => setState((prev) => ({ ...prev, userBudgets }));
  const setUserItems = (userItems) => setState((prev) => ({ ...prev, userItems }));
  const setUserPlanMaps = (userPlanMaps) => setState((prev) => ({ ...prev, userPlanMaps }));
  const setUserPins = (userPins) => setState((prev) => ({ ...prev, userPins }));
  const setUserTimelines = (userTimelines) => setState((prev) => ({ ...prev, userTimelines }));
  const setUserEvents = (userEvents) => setState((prev) => ({ ...prev, userEvents }));

  useEffect(() => {
    const auth = getAuth();
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Persistence set to browserLocalPersistence");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return () => unsubscribe();
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
        setLoading(false);
      });
  }, [setUser, setLoading]);

  // Use useFirestoreSnapshots hook to set up real-time listeners
  const generalCollections = [
    "users",
    "projects",
    "designs",
    "designVersions",
    "comments",
    "notifications",
    "projectBudgets",
    "budgets",
    "items",
    "planMaps",
    "pins",
    "timelines",
    "events",
  ];
  const userRelatedCollections = [
    "userDoc",
    "userProjects",
    "userDesigns",
    "userDesignVersions",
    "userDesignsComments",
    "userComments",
    "userNotifications",
    "userProjectBudgets",
    "userBudgets",
    "userItems",
    "userPlanMaps",
    "userPins",
    "userTimelines",
    "userEvents",
  ];
  const generalCollectionsStateSetterFunctions = {
    users: setUsers,
    projects: setProjects,
    designs: setDesigns,
    designVersions: setDesignVersions,
    comments: setComments,
    notifications: setNotifications,
    projectBudgets: setProjectBudgets,
    budgets: setBudgets,
    items: setItems,
    planMaps: setPlanMaps,
    pins: setPins,
    timelines: setTimelines,
    events: setEvents,
  };
  const userRelatedCollectionsStateSetterFunctions = {
    userDoc: setUserDoc,
    userProjects: setUserProjects,
    userDesigns: setUserDesigns,
    userDesignVersions: setUserDesignVersions,
    userDesignsComments: setUserDesignsComments,
    userComments: setUserComments,
    userNotifications: setUserNotifications,
    userProjectBudgets: setUserProjectBudgets,
    userBudgets: setUserBudgets,
    userItems: setUserItems,
    userPlanMaps: setUserPlanMaps,
    userPins: setUserPins,
    userTimelines: setUserTimelines,
    userEvents: setUserEvents,
  };

  const { isUserDataLoaded, isCollectionLoaded } = useFirestoreSnapshots(
    [...generalCollections, ...userRelatedCollections],
    {
      ...generalCollectionsStateSetterFunctions,
      ...userRelatedCollectionsStateSetterFunctions,
    },
    user ? user : null
  );

  const sharedProps = {
    ...state,
    user,
    setUser,
    userDoc,
    setUserDoc,
    handleLogout,
    loading,
    setLoading,
    setUsers,
    setProjects,
    setDesigns,
    setDesignVersions,
    setComments,
    setNotifications,
    setProjectBudgets,
    setBudgets,
    setItems,
    setPlanMaps,
    setPins,
    setTimelines,
    setEvents,
    setUserProjects,
    setUserDesigns,
    setUserDesignVersions,
    setUserDesignsComments,
    setUserComments,
    setUserNotifications,
    setUserProjectBudgets,
    setUserBudgets,
    setUserItems,
    setUserPlanMaps,
    setUserPins,
    setUserTimelines,
    setUserEvents,
  };

  if (!isCollectionLoaded || loading) {
    return (
      <SharedPropsContext.Provider value={sharedProps}>
        <Loading />
      </SharedPropsContext.Provider>
    );
  }

  return <SharedPropsContext.Provider value={sharedProps}>{children}</SharedPropsContext.Provider>;
}

export function useSharedProps() {
  const context = useContext(SharedPropsContext);
  if (!context) {
    throw new Error("useSharedProps must be used within a SharedPropsProvider");
  }
  return context;
}
