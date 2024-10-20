import { useState, useEffect } from "react";
import { isEqual } from "lodash";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  documentId,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};
const clientApp = initializeClientApp(firebaseConfig);
const db = getFirestore(clientApp);

const useFirestoreSnapshots = (collections, stateSetterFunctions, user) => {
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [isCollectionLoaded, setIsCollectionLoaded] = useState(false);

  // Effect for general collections
  useEffect(() => {
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
    const unsubscribeCallbacks = [];

    collections.forEach((collectionName) => {
      if (!generalCollections.includes(collectionName)) {
        // console.warn(`Warning: ${collectionName} is not a general collection.`);
        return;
      }

      const collectionRef = collection(db, collectionName);

      const unsubscribe = onSnapshot(
        collectionRef,
        (querySnapshot) => {
          const stateSetter = stateSetterFunctions[collectionName];
          if (stateSetter) {
            const updatedData = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            stateSetter(updatedData);
            console.log(
              `State updated for collection: ${collectionName} with ${updatedData.length} items`
            );
          } else {
            console.error(`No state setter found for collection: ${collectionName}`);
          }
        },
        (error) => {
          console.error(`Error in snapshot listener for ${collectionName}:`, error);
        }
      );

      unsubscribeCallbacks.push(unsubscribe);
    });

    setIsCollectionLoaded(true);

    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Effect for user-related data
  useEffect(() => {
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
    const collectionMapping = {
      userDoc: "users",
      userProjects: "projects",
      userDesigns: "designs",
      userDesignVersions: "designVersions",
      userDesignsComments: "comments",
      userComments: "comments",
      userNotifications: "notifications",
      userProjectBudgets: "projectBudgets",
      userBudgets: "budgets",
      userItems: "items",
      userPlanMaps: "planMaps",
      userPins: "pins",
      userTimelines: "timelines",
      userEvents: "events",
    };
    if (!user) {
      setIsUserDataLoaded(false);
      console.log("User is null, not setting up listeners");
      return;
    }

    const unsubscribers = [];

    const setupListener = (userDataName, fetchFunction) => {
      if (!userRelatedCollections.includes(userDataName)) {
        // console.warn(`Warning: ${collectionName} is not a user-related collection`);
        return;
      }
      const collectionName = collectionMapping[userDataName];
      if (!collectionName) {
        console.warn(`Warning: No collection mapping found for ${userDataName}`);
        return;
      }
      const unsubscribe = onSnapshot(collection(db, collectionName), async () => {
        try {
          const { data: newData } = await fetchFunction();
          const currentData = stateSetterFunctions[userDataName]();
          if (!isEqual(newData, currentData)) {
            stateSetterFunctions[userDataName](newData);
            console.log(
              `State updated for user data: ${userDataName} with ${newData.length} items`
            );
          }
        } catch (error) {
          console.error(`Error updating ${userDataName}:`, error);
        }
      });
      unsubscribers.push(unsubscribe);
    };

    const fetchData = async () => {
      try {
        const { data: userDocData } = await fetchUserDoc(user);
        stateSetterFunctions.userDoc(userDocData);
        setupListener("userDoc", () => fetchUserDoc(user));

        const { projectsSnapshot, data: projectsData } = await fetchUserProjects(user);
        stateSetterFunctions.userProjects(projectsData);
        setupListener("userProjects", () => fetchUserProjects(user));

        const { designsSnapshot, data: designsData } = await fetchUserDesigns(user);
        stateSetterFunctions.userDesigns(designsData);
        setupListener("userDesigns", () => fetchUserDesigns(user));

        const { designVersionsSnapshot, data: designVersionsData } = await fetchUserDesignVersions(
          designsSnapshot
        );
        stateSetterFunctions.userDesignVersions(designVersionsData);
        setupListener("userDesignVersions", () => fetchUserDesignVersions(designsSnapshot));

        const { data: designsCommentsData } = await fetchUserDesignsComments(
          designVersionsSnapshot
        );
        stateSetterFunctions.userDesignsComments(designsCommentsData);
        setupListener("userDesignsComments", () =>
          fetchUserDesignsComments(designVersionsSnapshot)
        );

        const { data: userCommentsData } = await fetchUserComments(user);
        stateSetterFunctions.userComments(userCommentsData);
        setupListener("userComments", () => fetchUserComments(user));

        const { data: notificationsData } = await fetchUserNotifications(user);
        stateSetterFunctions.userNotifications(notificationsData);
        setupListener("userNotifications", () => fetchUserNotifications(user));

        const { projectBudgetsSnapshot, data: projectBudgetsData } = await fetchUserProjectBudgets(
          projectsSnapshot
        );
        stateSetterFunctions.userProjectBudgets(projectBudgetsData);
        setupListener("userProjectBudgets", () => fetchUserProjectBudgets(projectsSnapshot));

        const { budgetsSnapshot, data: budgetsData } = await fetchUserBudgets(
          projectBudgetsSnapshot,
          designsSnapshot
        );
        stateSetterFunctions.userBudgets(budgetsData);
        setupListener("userBudgets", () =>
          fetchUserBudgets(projectBudgetsSnapshot, designsSnapshot)
        );

        const { data: itemsData } = await fetchUserItems(budgetsSnapshot);
        stateSetterFunctions.userItems(itemsData);
        setupListener("userItems", () => fetchUserItems(budgetsSnapshot));

        const { planMapsSnapshot, data: planMapsData } = await fetchUserPlanMaps(projectsSnapshot);
        stateSetterFunctions.userPlanMaps(planMapsData);
        setupListener("userPlanMaps", () => fetchUserPlanMaps(projectsSnapshot));

        const { data: pinsData } = await fetchUserPins(planMapsSnapshot);
        stateSetterFunctions.userPins(pinsData);
        setupListener("userPins", () => fetchUserPins(planMapsSnapshot));

        const { timelinesSnapshot, data: timelinesData } = await fetchUserTimelines(
          projectsSnapshot
        );
        stateSetterFunctions.userTimelines(timelinesData);
        setupListener("userTimelines", () => fetchUserTimelines(projectsSnapshot));

        const { data: eventsData } = await fetchUserEvents(timelinesSnapshot);
        stateSetterFunctions.userEvents(eventsData);
        setupListener("userEvents", () => fetchUserEvents(timelinesSnapshot));

        setIsUserDataLoaded(true);
      } catch (error) {
        console.error("Error fetching user data (snapshots):", error);
        setIsUserDataLoaded(false);
      }
    };

    fetchData();

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  return {
    isUserDataLoaded,
    isCollectionLoaded,
  };
};

//get user's document
const fetchUserDoc = async (user) => {
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnapshot = await getDoc(userDocRef);
  const data = { id: userDocSnapshot.id, ...userDocSnapshot.data() };
  return { userDocSnapshot, data };
};

//get all projects with user's document in users collection projects field projects: [{projectId: string, role: int}]
const fetchUserProjects = async (user) => {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();
  const projectIds = userData?.projects?.map((p) => p.projectId) || [];
  if (projectIds.length === 0) {
    return { projectsSnapshot: null, data: [] };
  }
  const projectsSnapshot = await getDocs(
    query(collection(db, "projects"), where(documentId(), "in", projectIds))
  );
  const data = projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { projectsSnapshot, data };
};

//get all designs with user's document in users collection designs field designs: [{designId: string, role: int}]
const fetchUserDesigns = async (user) => {
  const userDocDesigns = await getDoc(doc(db, "users", user.uid));
  const userData = userDocDesigns.data();
  const designIds = userData?.designs?.map((d) => d.designId) || [];
  if (designIds.length === 0) {
    return { designsSnapshot: null, data: [] };
  }
  const designsSnapshot = await getDocs(
    query(collection(db, "designs"), where(documentId(), "in", designIds))
  );
  const data = designsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { designsSnapshot, data };
};

//get all designVersions of userDesigns through the history field history: array of designVersionIds in designs collection
const fetchUserDesignVersions = async (designsSnapshot) => {
  if (!designsSnapshot || designsSnapshot.empty) {
    return { designVersionsSnapshot: null, data: [] };
  }
  const designVersionIds = designsSnapshot.docs.flatMap((doc) => doc.data().history || []);
  if (designVersionIds.length === 0) {
    return { designVersionsSnapshot: null, data: [] };
  }
  const designVersionsSnapshot = await getDocs(
    query(collection(db, "designVersions"), where(documentId(), "in", designVersionIds))
  );
  const data = designVersionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { designVersionsSnapshot, data };
};

//get all comments in userDesigns, meaning designVersionImageId of comments collection is in userDesignVersions
const fetchUserDesignsComments = async (designVersionsSnapshot) => {
  if (!designVersionsSnapshot || designVersionsSnapshot.empty) {
    return { commentsSnapshot: null, data: [] };
  }
  const imageIds = designVersionsSnapshot.docs.flatMap((doc) =>
    (doc.data().images || []).map((img) => img.imageId)
  );
  if (imageIds.length === 0) {
    return { commentsSnapshot: null, data: [] };
  }
  const commentsSnapshot = await getDocs(
    query(collection(db, "comments"), where("designVersionImageId", "in", imageIds))
  );
  const data = commentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { commentsSnapshot, data };
};

//get all user's comments in comments collection where userId = user's id
const fetchUserComments = async (user) => {
  const userCommentsSnapshot = await getDocs(
    query(collection(db, "comments"), where("userId", "==", user.uid))
  );
  const data = userCommentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { userCommentsSnapshot, data };
};

//get all notifications where userId = user's id
const fetchUserNotifications = async (user) => {
  const userNotificationsSnapshot = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", user.uid))
  );
  const data = userNotificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { userNotificationsSnapshot, data };
};

//get all user-related project budget by matching userProjects's project's projectBudgetId field in the projectBudget collection
const fetchUserProjectBudgets = async (projectsSnapshot) => {
  if (!projectsSnapshot || projectsSnapshot.empty) {
    return { projectBudgetsSnapshot: null, data: [] };
  }
  const projectBudgetIds = projectsSnapshot.docs
    .map((doc) => doc.data().projectBudgetId)
    .filter(Boolean);
  if (projectBudgetIds.length === 0) {
    return { projectBudgetsSnapshot: null, data: [] };
  }
  const projectBudgetsSnapshot = await getDocs(
    query(collection(db, "projectBudgets"), where(documentId(), "in", projectBudgetIds))
  );
  const data = projectBudgetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { projectBudgetsSnapshot, data };
};

//get all user-related budgets from the budgets array field of userProjectBudgets's documents AND also from the budgetId field of userDesigns's documents in the budgets collection
const fetchUserBudgets = async (projectBudgetsSnapshot, designsSnapshot) => {
  const budgetIdsFromProjects =
    projectBudgetsSnapshot?.docs.flatMap((doc) => doc.data().budgets || []) || [];
  const budgetIdsFromDesigns =
    designsSnapshot?.docs.map((doc) => doc.data().budgetId).filter(Boolean) || [];
  const allBudgetIds = [...new Set([...budgetIdsFromProjects, ...budgetIdsFromDesigns])];
  if (allBudgetIds.length === 0) {
    return { budgetsSnapshot: null, data: [] };
  }
  const budgetsSnapshot = await getDocs(
    query(collection(db, "budgets"), where(documentId(), "in", allBudgetIds))
  );
  const data = budgetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { budgetsSnapshot, data };
};

//get all user-related items from the items array field of userBudgets's documents in the items collection
const fetchUserItems = async (budgetsSnapshot) => {
  if (!budgetsSnapshot || budgetsSnapshot.empty) {
    return { itemsSnapshot: null, data: [] };
  }
  const itemIds = budgetsSnapshot.docs.flatMap((doc) => doc.data().items || []);
  if (itemIds.length === 0) {
    return { itemsSnapshot: null, data: [] };
  }
  const itemsSnapshot = await getDocs(
    query(collection(db, "items"), where(documentId(), "in", itemIds))
  );
  const data = itemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { itemsSnapshot, data };
};

//get all user-related plan maps by matching userProjects's project's planMapId field in the planMaps collection
const fetchUserPlanMaps = async (projectsSnapshot) => {
  if (!projectsSnapshot || projectsSnapshot.empty) {
    return { planMapsSnapshot: null, data: [] };
  }
  const planMapIds = projectsSnapshot.docs.map((doc) => doc.data().planMapId).filter(Boolean);
  if (planMapIds.length === 0) {
    return { planMapsSnapshot: null, data: [] };
  }
  const planMapsSnapshot = await getDocs(
    query(collection(db, "planMaps"), where(documentId(), "in", planMapIds))
  );
  const data = planMapsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { planMapsSnapshot, data };
};

//get all pins from the pins array field of userPlanMaps's documents in the pins collection
const fetchUserPins = async (planMapsSnapshot) => {
  if (!planMapsSnapshot || planMapsSnapshot.empty) {
    return { pinsSnapshot: null, data: [] };
  }
  const pinIds = planMapsSnapshot.docs.flatMap((doc) => doc.data().pins || []);
  if (pinIds.length === 0) {
    return { pinsSnapshot: null, data: [] };
  }
  const pinsSnapshot = await getDocs(
    query(collection(db, "pins"), where(documentId(), "in", pinIds))
  );
  const data = pinsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { pinsSnapshot, data };
};

//get all user-related timeline by matching userProjects's project's timelineId field in timelines collection
const fetchUserTimelines = async (projectsSnapshot) => {
  if (!projectsSnapshot || projectsSnapshot.empty) {
    return { timelinesSnapshot: null, data: [] };
  }
  const timelineIds = projectsSnapshot.docs.map((doc) => doc.data().timelineId).filter(Boolean);
  if (timelineIds.length === 0) {
    return { timelinesSnapshot: null, data: [] };
  }
  const timelinesSnapshot = await getDocs(
    query(collection(db, "timelines"), where(documentId(), "in", timelineIds))
  );
  const data = timelinesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { timelinesSnapshot, data };
};

//get all user-related events from the events array field of userTimelines's documents in the events collection
const fetchUserEvents = async (timelinesSnapshot) => {
  if (!timelinesSnapshot || timelinesSnapshot.empty) {
    return { eventsSnapshot: null, data: [] };
  }
  const eventIds = timelinesSnapshot.docs.flatMap((doc) => doc.data().events || []);
  if (eventIds.length === 0) {
    return { eventsSnapshot: null, data: [] };
  }
  const eventsSnapshot = await getDocs(
    query(collection(db, "events"), where(documentId(), "in", eventIds))
  );
  const data = eventsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { eventsSnapshot, data };
};

export default useFirestoreSnapshots;
