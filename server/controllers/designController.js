const { db, auth, clientAuth, clientDb, storage } = require("../firebase");
const { ref, uploadBytes, getDownloadURL, deleteObject } = require("firebase/storage");
const { doc, getDoc, arrayUnion } = require("firebase/firestore");
const projectController = require("./projectController");
const { createNotification } = require("./notificationController");
const { Resend } = require("resend");
const axios = require("axios");
const resend = new Resend(process.env.REACT_APP_RESEND_API_KEY);
const appURL = process.env.REACT_APP_URL;

const getPHCurrency = () => {
  let currency = {
    countryISO: "PH",
    currencyCode: "PHP",
    currencyName: "Philippines",
    currencySymbol: "₱",
    flagEmoji: "🇵🇭",
  };
  return currency;
};

// Create Design
exports.createDesign = async (req, res) => {
  const updatedDocuments = [];
  const createdDocuments = [];
  try {
    const { userId, designName } = req.body;

    // Create design document
    const designData = {
      designName,
      owner: userId,
      editors: [],
      commenters: [],
      viewers: [],
      history: [],
      projectId: null,
      createdAt: new Date(),
      modifiedAt: new Date(),
      isCopied: false,
      isCopiedFrom: { designId: "", versionId: "" },
      designSettings: {
        generalAccessSetting: 0, //0 for Restricted, 1 for Anyone with the link
        generalAccessRole: 0, //0 for viewer, 1 for editor, 2 for commenter, 3 for owner
        allowDownload: true,
        allowViewHistory: true,
        allowCopy: true,
        documentCopyByOwner: true,
        documentCopyByEditor: true,
        inactivityEnabled: true,
        inactivityDays: 30,
        deletionDays: 30,
        notifyDays: 7,
      },
    };

    const designRef = await db.collection("designs").add(designData);
    const designId = designRef.id;
    createdDocuments.push({ collection: "designs", id: designId });

    // Update the design document with the link field
    await designRef.update({
      link: `/design/${designId}`,
    });

    // Update user's designs array
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const updatedDesigns = userData.designs ? [...userData.designs] : [];
    updatedDesigns.push({ designId, role: 3 }); // 3 for owner
    if (!userDoc.exists) {
      throw new Error("User not found");
    }
    await userRef.update({
      designs: updatedDesigns,
    });

    res.status(200).json({
      id: designId,
      ...designData,
      link: `/design/${designId}`,
    });
  } catch (error) {
    console.error("Error creating design:", error);

    // Rollback updates
    for (const doc of updatedDocuments) {
      try {
        await doc.ref.update(doc.data);
        console.log(`Rolled back ${doc.data} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }
    // Rollback: delete all created documents
    for (const doc of createdDocuments) {
      try {
        await db.collection(doc.collection).doc(doc.id).delete();
        console.log(`Deleted ${doc.id} document from ${doc.collection} collection`);
      } catch (deleteError) {
        console.error(`Error deleting ${doc.collection} document ${doc.id}:`, deleteError);
      }
    }

    res.status(500).json({ message: "Error creating design", error: error.message });
  }
};

// Read
exports.fetchUserDesigns = async (req, res) => {
  try {
    const { userId } = req.params;
    const designsSnapshot = await db
      .collection("designs")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    const designs = designsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(designs);
  } catch (error) {
    console.error("Error fetching designs:", error);
    res.status(500).json({ error: "Failed to fetch designs" });
  }
};

// Get role name
const getRoleNameDesign = (role) => {
  switch (role) {
    case 0:
      return "Viewer";
    case 1:
      return "Editor";
    case 2:
      return "Commenter";
    case 3:
      return "Owner";
    default:
      return "";
  }
};

// Check if user is owner (manage)
const isOwnerDesign = (designDoc, userId) => {
  const designData = designDoc.data();
  const isOwner = designData.owner === userId;
  return isOwner;
};

// Check if user is owner or editor in design (editing)
const isOwnerEditorDesign = (designDoc, userId) => {
  const designData = designDoc.data();
  if (designData.designSettings.generalAccessSetting === 0) {
    // Restricted Access
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    return isOwner || isEditor;
  } else {
    // Anyone with the link
    if (designData.designSettings.generalAccessRole === 1) return true;
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    return isOwner || isEditor;
  }
};

// Check if user is owner, editor, commenter (commenting)
const isOwnerEditorCommenterDesign = (designDoc, userId) => {
  const designData = designDoc.data();
  if (designData.designSettings.generalAccessSetting === 0) {
    // Restricted Access
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    const isCommenter = designData.commenters.includes(userId);
    return isOwner || isEditor || isCommenter;
  } else {
    // Anyone with the link
    if (
      designData.designSettings.generalAccessRole === 2 ||
      designData.designSettings.generalAccessRole === 1
    )
      return true;
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    const isCommenter = designData.commenters.includes(userId);
    return isOwner || isEditor || isCommenter;
  }
};

// Check if user is owner, editor, commenter, viewer (viewing)
const isCollaboratorDesign = (designDoc, userId) => {
  const designData = designDoc.data();
  if (designData.designSettings.generalAccessSetting === 0) {
    // Restricted Access
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    const isCommenter = designData.commenters.includes(userId);
    const isViewer = designData.viewers.includes(userId);
    return isOwner || isEditor || isCommenter || isViewer;
  } else {
    // Anyone with the link
    if (
      designData.designSettings.generalAccessRole === 0 ||
      designData.designSettings.generalAccessRole === 1 ||
      designData.designSettings.generalAccessRole === 2
    )
      return true;
    const isOwner = designData.owner === userId;
    const isEditor = designData.editors.includes(userId);
    const isCommenter = designData.commenters.includes(userId);
    const isViewer = designData.viewers.includes(userId);
    return isOwner || isEditor || isCommenter || isViewer;
  }
};

// Check if user is manage (manage), manager not in generalAccessRole
const isManagerProject = (projectDoc, userId) => {
  const projectData = projectDoc.data();
  const isManager = projectData.managers.includes(userId);
  return isManager;
};

// Update Name
exports.updateDesignName = async (req, res) => {
  const updatedDocuments = [];
  try {
    const { designId } = req.params;
    const { name, userId } = req.body;
    const designRef = db.collection("designs").doc(designId);

    // Store previous name for potential rollback
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    // Check user role in design
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res.status(403).json({ error: "User does not have permission to rename a design" });
    }

    const previousName = designDoc.data().designName;
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "designName",
      previousValue: previousName,
    });

    // Perform update
    await designRef.update({ designName: name, modifiedAt: new Date() });

    // Notification
    try {
      // Get user settings for all users who need to be notified
      const design = designDoc.data();
      const usersToNotify = [
        design.owner,
        ...design.editors,
        ...design.commenters,
        ...design.viewers,
      ].filter((userId) => userId !== req.body.userId);
      const userSettingsPromises = usersToNotify.map((userId) =>
        db.collection("users").doc(userId).get()
      );
      const userDocs = await Promise.all(userSettingsPromises);
      for (const userDoc of userDocs) {
        if (!userDoc.exists) continue;
        const userId = userDoc.id;
        const settings = userDoc.data().notifSettings;
        // Skip if it's the current user or if notifications are disabled
        if (userId === req.body.userId || !settings?.allowNotif || !settings?.renamedDesign)
          continue;
        // Send notification
        await createNotification(
          userId,
          "design-update",
          "Design Renamed",
          `The design "${previousName}" has been renamed to "${name}"`,
          req.body.userId,
          `/design/${designId}`,
          ["Highlight design name"],
          { designId }
        );
      }
    } catch (notifError) {
      console.log("Notification error (non-critical):", notifError.message);
    }

    res.status(200).json({
      success: true,
      message: "Design name updated successfully",
      designName: name,
    });
  } catch (error) {
    console.error("Error updating design name:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    res.status(500).json({ error: "Failed to update design name" });
  }
};

// Update Design Settings
exports.updateDesignSettings = async (req, res) => {
  const updatedDocuments = [];
  try {
    const { designId } = req.params;
    const { designSettings, userId } = req.body;

    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();

    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    // Check user role in design
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Store the previous settings before update
    const previousSettings = designDoc.data().designSettings;
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "designSettings",
      previousValue: previousSettings,
    });

    // Perform update
    await designRef.update({
      designSettings: designSettings,
      modifiedAt: new Date(),
    });

    res.status(200).json({
      message: "Design settings updated successfully",
      designSettings: designSettings,
    });
  } catch (error) {
    console.error("Error updating design settings:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    res.status(500).json({ error: "Failed to update design settings" });
  }
};

// Get Design History/Versions' Data
exports.getDesignVersionDetails = async (req, res) => {
  try {
    const { designId } = req.params;

    // Get the design document
    const designDoc = await db.collection("designs").doc(designId).get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }

    const designData = designDoc.data();
    const versionDetails = [];

    // Get details for each version in history
    for (const versionId of designData.history) {
      const versionDoc = await db.collection("designVersions").doc(versionId).get();
      if (versionDoc.exists) {
        const versionData = versionDoc.data();
        versionDetails.push({
          id: versionId,
          ...versionData,
          imagesLink: versionData.images?.map((img) => img.link) || [],
        });
      }
    }

    res.status(200).json({ versionDetails });
  } catch (error) {
    console.error("Error getting design version details:", error);
    res.status(500).json({ error: "Failed to get design version details" });
  }
};

// Restore Design Version
exports.restoreDesignVersion = async (req, res) => {
  const createdDocuments = [];
  const updatedDocuments = [];
  try {
    const { designId, versionId } = req.params;
    const { userId } = req.body;
    console.log("restoreDesignVersion - ", { designId, versionId, userId });

    // Get the design document & version to restore
    const designDoc = await db.collection("designs").doc(designId).get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const versionDoc = await db.collection("designVersions").doc(versionId).get();
    if (!versionDoc.exists) {
      return res.status(404).json({ error: "Design version not found" });
    }
    // Check user role in design
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Create new version document with empty field
    const newVersionData = {
      description: versionDoc.data().description,
      images: [],
      createdAt: new Date(),
      copiedDesigns: [],
      isRestored: true,
      isRestoredFrom: { designId, versionId },
    };
    const newVersionRef = await db.collection("designVersions").add(newVersionData);
    const newVersionId = newVersionRef.id;
    createdDocuments.push({ collection: "designVersions", id: newVersionId });

    // Get current history array and append new version then update design document
    const currentHistory = designDoc.data().history || [];
    const updatedHistory = [...currentHistory, newVersionId];
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "history",
      previousValue: currentHistory,
    });
    await db.collection("designs").doc(designId).update({
      history: updatedHistory,
      modifiedAt: new Date(),
    });

    // Create new budget for restored version
    let newBudgetData;
    const versionData = versionDoc.data();

    // Check if version has a valid budgetId
    if (versionData?.budgetId) {
      console.log("restoreDesignVersion - getting orig budget with ID:", versionData.budgetId);
      const originalBudget = await db.collection("budgets").doc(versionData.budgetId).get();

      if (originalBudget.exists) {
        newBudgetData = {
          designVersionId: newVersionRef.id,
          budget: originalBudget.data().budget,
          items: originalBudget.data().items,
          createdAt: new Date(),
          modifiedAt: new Date(),
        };
      }
    }

    // If no valid budget found, create default budget
    if (!newBudgetData) {
      console.log("restoreDesignVersion - creating default budget");
      newBudgetData = {
        designVersionId: newVersionRef.id,
        budget: { amount: 0, currency: getPHCurrency() },
        items: [],
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
    }

    console.log("restoreDesignVersion - creating new budget with data:", newBudgetData);
    const newBudgetRef = await db.collection("budgets").add(newBudgetData);
    createdDocuments.push({ collection: "budgets", id: newBudgetRef.id });

    // Copy data from original version to new version
    await newVersionRef.update({
      images: versionDoc.data().images,
      budgetId: newBudgetRef.id,
    });

    res.status(200).json({
      success: true,
      message: "Design version restored successfully",
      versionId: newVersionId,
    });
  } catch (error) {
    console.error("Error restoring design version:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    // Rollback created documents
    for (const doc of createdDocuments) {
      try {
        await db.collection(doc.collection).doc(doc.id).delete();
        console.log(`Deleted ${doc.id} document from ${doc.collection} collection`);
      } catch (deleteError) {
        console.error(`Error deleting ${doc.collection} document ${doc.id}:`, deleteError);
      }
    }

    res.status(500).json({ error: "Failed to restore design version" });
  }
};

// Make a Copy of Design
exports.copyDesign = async (req, res) => {
  const createdDocuments = [];
  const updatedDocuments = [];
  try {
    const { designId, versionId } = req.params;
    const { userId, shareWithCollaborators } = req.body;
    console.log("copyDesign - ", { designId, versionId, userId, shareWithCollaborators });

    // Get original design and version documents
    const origDesignDoc = await db.collection("designs").doc(designId).get();
    const origDesignData = origDesignDoc.data();
    if (!origDesignDoc.exists) {
      return res.status(404).json({ error: "Original design not found" });
    }
    // Check user role in design
    const allowAction = isOwnerEditorDesign(origDesignDoc, userId);
    if (!allowAction || !origDesignData.designSettings.allowCopy) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Step 1: Create empty design document first (following dependency order)
    const emptyDesignData = {
      designName: "",
      owner: "",
      editors: [],
      commenters: [],
      viewers: [],
      history: [],
      projectId: "",
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    const newDesignRef = await db.collection("designs").add(emptyDesignData);
    const newDesignId = newDesignRef.id;
    createdDocuments.push({ collection: "designs", id: newDesignId });

    // Step 2.1: Create new version for the design
    const versionDoc = await db.collection("designVersions").doc(versionId).get();
    const newVersionData = {
      description: versionDoc.data().description,
      images: versionDoc.data().images,
      createdBy: userId,
      createdAt: new Date(),
      copiedDesigns: [],
      isRestored: false,
    };
    const newVersionRef = await db.collection("designVersions").add(newVersionData);
    const newVersionId = newVersionRef.id;
    createdDocuments.push({ collection: "designVersions", id: newVersionId });
    console.log("copyDesign - created new designVersion", newVersionId);

    // Step 2.2: Create new budget for the version
    let newBudgetData;
    const versionData = versionDoc.data();
    // Check if version has a valid budgetId
    if (versionData?.budgetId) {
      console.log("copyDesign - getting orig budget with ID:", versionData.budgetId);
      const originalBudget = await db.collection("budgets").doc(versionData.budgetId).get();
      if (originalBudget.exists) {
        newBudgetData = {
          designVersionId: newVersionId,
          budget: originalBudget.data().budget,
          items: originalBudget.data().items,
          createdAt: new Date(),
          modifiedAt: new Date(),
        };
      }
    }
    // If no valid budget found, create default budget
    if (!newBudgetData) {
      console.log("copyDesign - creating default budget");
      newBudgetData = {
        designVersionId: newVersionRef.id,
        budget: { amount: 0, currency: getPHCurrency() },
        items: [],
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
    }

    const newBudgetRef = await db.collection("budgets").add(newBudgetData);
    const newBudgetId = newBudgetRef.id;
    createdDocuments.push({ collection: "budgets", id: newBudgetRef.id });
    await newVersionRef.update({ budgetId: newBudgetRef.id });
    console.log("copyDesign - created new budget", newBudgetRef.id);

    // Step 3: Create empty items (following dependency order)
    const newItemIds = [];
    for (const origItemId of newBudgetData.items) {
      const emptyItemRef = await db.collection("items").add({
        itemName: "",
        description: "",
        cost: { amount: 0, currency: getPHCurrency() },
        quantity: 0,
        image: "",
        includedInTotal: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
        budgetId: newBudgetId,
      });
      newItemIds.push(emptyItemRef.id);
      createdDocuments.push({ collection: "items", id: emptyItemRef.id });
    }
    console.log("copyDesign - created empty items", newItemIds);

    // Step 4: Update user's designs array (parent collection update)
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }
    const userData = userDoc.data();
    const updatedDesigns = userData.designs ? [...userData.designs] : [];
    updatedDesigns.push({ designId: newDesignId, role: 2 }); // 2 for owner
    updatedDocuments.push({
      collection: "users",
      id: userId,
      field: "designs",
      previousValue: userData.designs,
    });
    await userRef.update({ designs: updatedDesigns });
    console.log("copyDesign - updated user designs of copy (updatedDesigns)", updatedDesigns);

    // Step 5: Update version's copiedDesigns array
    const versionRef = db.collection("designVersions").doc(versionId);
    const previousCopiedDesigns = versionDoc.data().copiedDesigns || [];
    updatedDocuments.push({
      collection: "designVersions",
      id: versionId,
      field: "copiedDesigns",
      previousValue: previousCopiedDesigns,
    });
    const newCopiedDesigns = [...previousCopiedDesigns, newDesignId];
    await versionRef.update({
      copiedDesigns: newCopiedDesigns,
    });
    console.log("copyDesign - updated version's copiedDesigns array", newCopiedDesigns);

    // Step 6: Update design document with full data
    const fullDesignData = {
      designName: `Copy of ${origDesignData.designName}`,
      owner: userId,
      editors: shareWithCollaborators
        ? userId !== origDesignData.owner
          ? [...origDesignData.editors, userId]
          : origDesignData.editors
        : [],
      commenters: shareWithCollaborators ? origDesignData.commenters : [],
      viewers: shareWithCollaborators ? origDesignData.viewers : [],
      history: [newVersionId],
      projectId: "",
      link: `/design/${newDesignId}`,
      isCopied: true,
      isCopiedFrom: { designId, versionId },
      designSettings: shareWithCollaborators
        ? origDesignData.designSettings
        : {
            generalAccessSetting: 0,
            generalAccessRole: 0,
            allowDownload: true,
            allowViewHistory: true,
            allowCopy: true,
            documentCopyByOwner: true,
            documentCopyByEditor: true,
            inactivityEnabled: true,
            inactivityDays: 30,
            deletionDays: 30,
            notifyDays: 7,
          },
      modifiedAt: new Date(),
    };
    await newDesignRef.update(fullDesignData);
    console.log("copyDesign - updated design document with full data", fullDesignData);

    // Step 7: Update budget document with full data
    const updatedBudgetData = {
      budget: newBudgetData.budget,
      items: newItemIds,
      modifiedAt: new Date(),
    };
    await newBudgetRef.update(updatedBudgetData);
    console.log("copyDesign - updated budget document with full data", updatedBudgetData);

    // Step 8: Update items with full data
    for (let i = 0; i < newBudgetData.items.length; i++) {
      const origItemDoc = await db.collection("items").doc(newBudgetData.items[i]).get();
      if (origItemDoc.exists) {
        const origItemData = origItemDoc.data();
        await db
          .collection("items")
          .doc(newItemIds[i])
          .update({
            ...origItemData,
            budgetId: newBudgetId,
            modifiedAt: new Date(),
          });
      }
    }
    console.log("copyDesign - updated items with full data (ids)", newItemIds);

    res.status(200).json({
      success: true,
      message: "Design copied successfully",
      designId: newDesignId,
    });
  } catch (error) {
    console.error("Error copying design:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    // Rollback created documents
    for (const doc of createdDocuments) {
      try {
        await db.collection(doc.collection).doc(doc.id).delete();
        console.log(`Deleted ${doc.id} document from ${doc.collection} collection`);
      } catch (deleteError) {
        console.error(`Error deleting ${doc.collection} document ${doc.id}:`, deleteError);
      }
    }

    res.status(500).json({ error: "Failed to copy design" });
  }
};

const sendEmail = async (to, subject, body) => {
  try {
    // "decoraition@gmail.com" or "no-reply@decoraition.org"
    const response = await resend.emails.send({
      from: "no-reply@decoraition.org",
      to,
      subject,
      html: body,
    });

    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

const sendEmailBcc = async (to, bcc, subject, body) => {
  try {
    // "decoraition@gmail.com" or "no-reply@decoraition.org"
    const response = await resend.emails.send({
      from: "no-reply@decoraition.org",
      to,
      bcc,
      subject,
      html: body,
    });

    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

exports.shareDesign = async (req, res) => {
  const updatedDocuments = [];

  try {
    const { designId } = req.params;
    const { userId, emails, role, message, notifyPeople } = req.body;
    console.log("sharedata - ", { designId, userId, emails, role, message, notifyPeople });

    const getRoleField = (role) => {
      switch (role) {
        case 1:
          return "editors";
        case 2:
          return "commenters";
        case 0:
          return "viewers";
        default:
          return null;
      }
    };

    // Get the design document
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const designData = designDoc.data();
    // Check user role in design
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res.status(403).json({ error: "User does not have permission to share design" });
    }

    // Get user data for email notification
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const userData = userDoc.data();
    const userUsername = userData.username || `${userData.firstName} ${userData.lastName}`;
    const userEmail = userData.email;

    // Process each email
    const batch = db.batch();
    const userEmails = [];
    const nonUserEmails = [];
    const usersToAdd = {
      editors: [],
      commenters: [],
      viewers: [],
    };

    for (const email of emails) {
      const userSnapshot = await db.collection("users").where("email", "==", email).get();

      if (!userSnapshot.empty) {
        // User exists
        const userData = userSnapshot.docs[0].data();
        const collaboratorId = userSnapshot.docs[0].id;
        userEmails.push({
          email,
          username: userData.username || `${userData.firstName} ${userData.lastName}`,
        });

        // Update user's designs array
        const userRef = db.collection("users").doc(collaboratorId);
        const userDoc = await userRef.get();
        const currentDesigns = userDoc.data().designs || [];
        const newDesign = { designId, role };

        if (!currentDesigns.some((design) => design.designId === designId)) {
          updatedDocuments.push({
            collection: "users",
            id: collaboratorId,
            field: "designs",
            previousValue: currentDesigns,
          });
          batch.update(userRef, {
            designs: [...currentDesigns, newDesign],
          });
        }

        // Add to appropriate role array in design
        const roleField = getRoleField(role);
        if (roleField) {
          const currentRoleArray = designData[roleField] || [];
          if (!currentRoleArray.includes(collaboratorId)) {
            usersToAdd[roleField].push(collaboratorId);
          }
        }
      }
    }

    // Update design document with all users at once
    Object.entries(usersToAdd).forEach(([roleField, userIds]) => {
      if (userIds.length > 0) {
        const currentRoleArray = designData[roleField] || [];
        const newRoleArray = [...new Set([...currentRoleArray, ...userIds])];
        updatedDocuments.push({
          collection: "designs",
          id: designId,
          field: roleField,
          previousValue: currentRoleArray,
        });
        batch.update(designRef, {
          [roleField]: newRoleArray,
        });
      }
    });

    // Commit all updates
    await batch.commit();
    console.log("sharedata - upfatedDocuments - ", updatedDocuments);

    // Send emails if notifyPeople is true
    if (notifyPeople) {
      const emailBody = `<p>You have been added as a <strong>${getRoleNameDesign(
        role
      )}</strong> in this design.</p>
        <p>You can access the design here: <a href="${appURL}/design/${designId}">${
        designData.designName
      }</a></p>
        ${message && `<p>Message from ${userUsername} (${userEmail}):</p><p>${message}</p>`}`;

      await sendEmailBcc(
        userEmail, // primary recipient
        [...userEmails.map((ue) => ue.email), ...nonUserEmails], // BCC recipients
        "DecorAItion - Design Shared with You",
        emailBody
      );
    }

    // Send notifications to all newly added users
    try {
      if (notifyPeople) {
        for (const [roleField, userIds] of Object.entries(usersToAdd)) {
          for (const userId of userIds) {
            try {
              await createNotification(
                userId,
                "design-update",
                "New Design Shared",
                `You have been given ${getRoleNameDesign(role)} access to the design "${
                  designData.designName
                }"`,
                req.body.userId, //notifBy
                `/design/${designId}`,
                ["Open view collaborators modal", "Highlight user id"],
                { designId, userId }
              );
            } catch (notifError) {
              console.error("Error sending notification to user:", userId, notifError);
            }
          }
        }
      }
    } catch (notifError) {
      console.error("Notification error (non-critical):", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Design shared successfully",
    });
  } catch (error) {
    console.error("Error sharing design:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    res.status(500).json({
      success: false,
      error: "Failed to share design",
    });
  }
};

exports.changeAccessDesign = async (req, res) => {
  const updatedDocuments = [];

  try {
    const { designId } = req.params;
    const { userId, initEmailsWithRole, emailsWithRole, generalAccessSetting, generalAccessRole } =
      req.body;
    console.log("changeAccessDesign - ", {
      designId,
      userId,
      initEmailsWithRole,
      emailsWithRole,
      generalAccessSetting,
      generalAccessRole,
    });

    // Get design document
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Design not found",
      });
    }
    const designData = designDoc.data();
    // Check user role in design
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to update collaborators' access" });
    }

    // Get all users by email
    const usersSnapshot = await db
      .collection("users")
      .where(
        "email",
        "in",
        initEmailsWithRole.map((e) => e.email.toLowerCase())
      )
      .get();

    const usersByEmail = {};
    usersSnapshot.forEach((doc) => {
      usersByEmail[doc.data().email.toLowerCase()] = {
        id: doc.id,
        ...doc.data(),
      };
    });

    // Update parent documents (users) first
    for (const initUser of initEmailsWithRole) {
      const lowerEmail = initUser.email.toLowerCase();
      const user = usersByEmail[lowerEmail];
      if (!user) continue;

      const userRef = db.collection("users").doc(user.id);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      // Update user's designs array
      const userDesigns = userData.designs || [];
      const designIndex = userDesigns.findIndex((d) => d.designId === designId);
      // Check if user is in emailsWithRole
      const updatedUser = emailsWithRole.find((e) => e.email.toLowerCase() === lowerEmail);
      if (!updatedUser) {
        // Remove access if user is not in emailsWithRole
        if (designIndex >= 0) {
          userDesigns.splice(designIndex, 1);
          updatedDocuments.push({
            ref: userRef,
            field: "designs",
            previousValue: userData.designs,
          });
          await userRef.update({ designs: userDesigns });
        }
      } else if (updatedUser.role !== initUser.role) {
        // Update role if it changed
        if (designIndex >= 0) {
          userDesigns[designIndex].role = updatedUser.role;
          updatedDocuments.push({
            ref: userRef,
            field: "designs",
            previousValue: userData.designs,
          });
          await userRef.update({ designs: userDesigns });
        }
      }
    }

    // Update design document (child)
    const editors = [...(designData.editors || [])];
    const commenters = [...(designData.commenters || [])];
    const viewers = [...(designData.viewers || [])];

    // Remove users from their previous roles and add to new roles
    for (const initUser of initEmailsWithRole) {
      const lowerEmail = initUser.email.toLowerCase();
      const user = usersByEmail[lowerEmail];
      if (!user) continue;

      // Remove from previous role array
      switch (initUser.role) {
        case 1:
          const editorIndex = editors.indexOf(user.id);
          if (editorIndex > -1) editors.splice(editorIndex, 1);
          break;
        case 2:
          const commenterIndex = commenters.indexOf(user.id);
          if (commenterIndex > -1) commenters.splice(commenterIndex, 1);
          break;
        case 0:
          const viewerIndex = viewers.indexOf(user.id);
          if (viewerIndex > -1) viewers.splice(viewerIndex, 1);
          break;
        default:
          break;
      }

      // Add to new role array if user is in emailsWithRole
      const updatedUser = emailsWithRole.find((e) => e.email.toLowerCase() === lowerEmail);
      if (updatedUser) {
        switch (updatedUser.role) {
          case 1:
            if (!editors.includes(user.id)) editors.push(user.id);
            break;
          case 2:
            if (!commenters.includes(user.id)) commenters.push(user.id);
            break;
          case 0:
            if (!viewers.includes(user.id)) viewers.push(user.id);
            break;
          default:
            break;
        }
      }
    }

    // Prepare the update object
    const updateObject = {
      editors,
      commenters,
      viewers,
      modifiedAt: new Date(),
    };

    // Add design settings update if they've changed
    if (typeof generalAccessSetting !== "undefined" || typeof generalAccessRole !== "undefined") {
      updateObject.designSettings = {
        ...designData.designSettings,
        ...(typeof generalAccessSetting !== "undefined" && { generalAccessSetting }),
        ...(typeof generalAccessRole !== "undefined" && { generalAccessRole }),
      };
    }

    const previousDesignSettings = {
      ...designData.designSettings,
    };
    updatedDocuments.push({
      ref: designRef,
      previousValue: {
        editors: designData.editors,
        commenters: designData.commenters,
        viewers: designData.viewers,
        designSettings: previousDesignSettings,
      },
    });
    await designRef.update(updateObject);
    console.log("changeAccessDesign - updatedDocuments - ", updatedDocuments);

    // Send notifications
    try {
      // 1. Get user settings for all users who need to be notified
      const userSettingsPromises = initEmailsWithRole.map((user) =>
        db.collection("users").doc(user.userId).get()
      );
      const userDocs = await Promise.all(userSettingsPromises);
      const userSettings = userDocs.reduce((acc, doc) => {
        if (doc.exists) acc[doc.id] = doc.data().notifSettings;
        return acc;
      }, {});

      // 2. Find users whose roles actually changed
      const usersWithChangedRoles = emailsWithRole.filter((user) => {
        const initUser = initEmailsWithRole.find((init) => init.userId === user.userId);
        return !initUser || initUser.role !== user.role;
      });

      // 3. Find users who had their access removed
      const removedUsers = initEmailsWithRole.filter(
        (initUser) => !emailsWithRole.some((user) => user.userId === initUser.userId)
      );

      // 4. Send notifications to users with changed roles
      for (const user of usersWithChangedRoles) {
        // Skip if it's the current user or if notifications are disabled
        if (
          user.userId === req.body.userId ||
          !userSettings[user.userId]?.allowNotif ||
          !userSettings[user.userId]?.changeRoleInDesign
        ) {
          continue;
        }

        await createNotification(
          user.userId,
          "design-update",
          "Design Role Updated",
          `Your role in the design "${designData.designName}" has been changed to ${user.roleLabel}`,
          req.body.userId,
          `/design/${designId}`,
          ["Open view collaborators modal", "Highlight user id"],
          { designId, userId: user.userId }
        );
      }

      // 5. Send notifications to users who had access removed
      for (const user of removedUsers) {
        // Skip if it's the current user or if notifications are disabled
        if (
          user.userId === req.body.userId ||
          !userSettings[user.userId]?.allowNotif ||
          !userSettings[user.userId]?.changeRoleInDesign
        ) {
          continue;
        }

        await createNotification(
          user.userId,
          "design-update",
          "Design Access Removed",
          `Your access to the design "${designData.designName}" has been removed`,
          req.body.userId,
          `/design/${designId}`,
          [],
          { designId }
        );
      }
    } catch (notifError) {
      console.error("Notification error (non-critical):", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Design access changed",
    });
  } catch (error) {
    console.error("Error updating design:", error);

    // Rollback updates
    for (const update of updatedDocuments) {
      try {
        if (update.field) {
          await update.ref.update({ [update.field]: update.previousValue });
        } else {
          await update.ref.update(update.previousValue);
        }
      } catch (rollbackError) {
        console.error("Error rolling back update:", rollbackError);
      }
    }

    res.status(500).json({
      success: false,
      error: "Failed to change access of design collaborators",
    });
  }
};

exports.updateDesignVersionImageDescription = async (req, res) => {
  const updatedDocuments = [];
  try {
    const { designId, designVersionId } = req.params;
    const { description, imageId, userId } = req.body;

    // Check user role in design
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Store previous name for potential rollback
    const designVersionRef = db.collection("designVersions").doc(designVersionId);
    const designVersionDoc = await designVersionRef.get();
    if (!designVersionDoc.exists) {
      return res.status(404).json({ error: "Design version not found" });
    }
    const previousImages = designVersionDoc.data().images;
    const updatedImages = previousImages.map((img) =>
      img.imageId === imageId ? { ...img, description } : img
    );
    updatedDocuments.push({
      collection: "designVersions",
      id: designVersionId,
      field: "images",
      previousValue: previousImages,
    });

    // Perform update
    await designVersionRef.update({ images: updatedImages, modifiedAt: new Date() });
    res.status(200).json({
      success: true,
      message: "Design name updated successfully",
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error updating design name:", error);

    // Rollback updates to existing documents
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
        console.log(`Rolled back ${doc.field} in ${doc.collection} document ${doc.id}`);
      } catch (rollbackError) {
        console.error(`Error rolling back ${doc.collection} document ${doc.id}:`, rollbackError);
      }
    }

    res.status(500).json({ error: "Failed to update design name" });
  }
};

// Create Design Version
exports.createDesignVersion = async (req, res) => {
  const createdDocuments = [];
  const updatedDocuments = [];
  try {
    const { designId } = req.params;
    const { userId, images, prompt } = req.body;

    // Check user role in design
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Create empty version first
    const emptyDesignVersionData = {
      description: "",
      images: [],
      createdBy: userId,
      createdAt: new Date(),
      copiedDesigns: [],
      isRestored: false,
      isRestoredFrom: null,
    };
    const newVersionRef = await db.collection("designVersions").add(emptyDesignVersionData);
    const newVersionId = newVersionRef.id;
    createdDocuments.push({
      collection: "designVersions",
      id: newVersionId,
      data: emptyDesignVersionData,
    });

    // Update design document (parent)
    const previousHistory = designDoc.data().history || [];
    const updatedHistory = [...previousHistory, newVersionId];
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "history",
      previousValue: previousHistory,
    });
    await designRef.update({
      history: updatedHistory,
      modifiedAt: new Date(),
    });

    // Process images and upload to Firebase Storage
    const updatedImages = await Promise.all(
      images.map(async (img) => {
        const imageId = db.collection("_").doc().id;
        const imageName = img.link.split("/").pop();
        const storagePath = `designs/${designId}/versions/${newVersionId}/images/${imageName}`;
        const storageRef = ref(storage, storagePath);

        try {
          const aiApiUrl = `https://ai-api.decoraition.org/static/images/${imageName}`;
          const response = await axios.get(aiApiUrl, { responseType: "arraybuffer" });
          const imageBuffer = Buffer.from(response.data, "binary");

          await uploadBytes(storageRef, imageBuffer, {
            contentType: "image/png",
          });
          const downloadURL = await getDownloadURL(storageRef);

          return {
            ...img,
            imageId,
            link: downloadURL,
            storagePath,
          };
        } catch (error) {
          console.error(`Error processing image ${imageName}:`, error);
          throw error;
        }
      })
    );

    console.log("createDesignVersion - updatedImages", updatedImages);
    if (!updatedImages || updatedImages.length === 0) {
      throw new Error("Failed to generate image");
    }

    // Create associated budget document
    // Get previous version's budget if design has history
    let budgetData;
    if (previousHistory.length > 0) {
      const previousVersionId = previousHistory[previousHistory.length - 1];
      const previousVersionDoc = await db.collection("designVersions").doc(previousVersionId).get();
      if (previousVersionDoc.exists && previousVersionDoc.data().budgetId) {
        const previousBudgetDoc = await db
          .collection("budgets")
          .doc(previousVersionDoc.data().budgetId)
          .get();
        if (previousBudgetDoc.exists) {
          // Use previous budget data but with new designVersionId
          budgetData = {
            designVersionId: newVersionId,
            budget: previousBudgetDoc.data().budget,
            items: previousBudgetDoc.data().items,
            createdAt: new Date(),
            modifiedAt: new Date(),
          };
        }
      }
    }

    // If no previous budget found, create empty budget
    if (!budgetData) {
      budgetData = {
        designVersionId: newVersionId,
        budget: {
          amount: 0,
          currency: getPHCurrency(),
        },
        items: [],
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
    }

    const budgetRef = await db.collection("budgets").add(budgetData);
    const budgetId = budgetRef.id;
    createdDocuments.push({ collection: "budgets", id: budgetId });

    // Update version with full data
    const fullVersionData = {
      description: prompt,
      images: updatedImages,
      createdBy: userId,
      createdAt: new Date(),
      budgetId: budgetId,
      copiedDesigns: [],
      isRestored: false,
      isRestoredFrom: null,
    };
    await newVersionRef.update(fullVersionData);
    createdDocuments[0].data = fullVersionData;

    res.status(200).json({
      success: true,
      message: "Design version created successfully",
      versionId: newVersionId,
    });
  } catch (error) {
    console.error("Error creating design version:", error);

    // Rollback updates
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
      } catch (rollbackError) {
        console.error(`Rollback failed for ${doc.collection}/${doc.id}:`, rollbackError);
      }
    }
    // Rollback created documents and delete storage files
    for (const doc of createdDocuments) {
      try {
        // Delete Firestore document
        await db.collection(doc.collection).doc(doc.id).delete();
        // Delete associated storage files if they exist
        if (doc.data?.images) {
          await Promise.all(
            doc.data.images.map(async (img) => {
              if (img.storagePath) {
                const imageRef = ref(storage, img.storagePath);
                try {
                  await deleteObject(imageRef);
                } catch (deleteError) {
                  console.error(`Error deleting image ${img.storagePath}:`, deleteError);
                }
              }
            })
          );
        }
      } catch (deleteError) {
        console.error(`Deletion failed for ${doc.collection}/${doc.id}:`, deleteError);
      }
    }

    res.status(500).json({ error: "Failed to create design version" });
  }
};

// Update Design Version SAM Masks
exports.updateDesignVersionSamMask = async (req, res) => {
  const updatedDocuments = [];
  try {
    const { designId, designVersionId } = req.params;
    const { userId, designVersionImageId, samMasks } = req.body;

    // Check user role in design
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Get current images array
    const designVersionRef = db.collection("designVersions").doc(designVersionId);
    const designVersionDoc = await designVersionRef.get();
    const currentImages = designVersionDoc.data().images;
    const imageIndex = currentImages.findIndex((img) => img.imageId === designVersionImageId);

    // Process and upload each mask
    const updatedSamMasks = await Promise.all(
      samMasks.map(async (mask, index) => {
        // Upload blended image
        const blendedName = `blended_${index}_${Date.now()}.png`;
        const blendedPath = `designs/${designId}/versions/${designVersionId}/${designVersionImageId}/masks/${blendedName}`;
        const blendedRef = ref(storage, blendedPath);
        const blendedResponse = await axios.get(mask.blended, { responseType: "arraybuffer" });
        await uploadBytes(blendedRef, Buffer.from(blendedResponse.data), {
          contentType: "image/png",
        });
        const blendedURL = await getDownloadURL(blendedRef);

        // Upload mask image
        const maskName = `mask_${index}_${Date.now()}.png`;
        const maskPath = `designs/${designId}/versions/${designVersionId}/${designVersionImageId}/masks/${maskName}`;
        const maskRef = ref(storage, maskPath);
        const maskResponse = await axios.get(mask.mask, { responseType: "arraybuffer" });
        await uploadBytes(maskRef, Buffer.from(maskResponse.data), { contentType: "image/png" });
        const maskURL = await getDownloadURL(maskRef);

        // Upload masked image
        const maskedName = `masked_${index}_${Date.now()}.png`;
        const maskedPath = `designs/${designId}/versions/${designVersionId}/${designVersionImageId}/masks/${maskedName}`;
        const maskedRef = ref(storage, maskedPath);
        const maskedResponse = await axios.get(mask.masked, { responseType: "arraybuffer" });
        await uploadBytes(maskedRef, Buffer.from(maskedResponse.data), {
          contentType: "image/png",
        });
        const maskedURL = await getDownloadURL(maskedRef);

        return {
          id: mask.id,
          blended: blendedURL,
          mask: maskURL,
          masked: maskedURL,
        };
      })
    );

    // Update the specific image's masks in the images array
    const updatedImages = [...currentImages];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      masks: {
        samMasks: updatedSamMasks,
        combinedMask: {
          samMaskImage: "",
          samMaskMask: "",
        },
      },
    };

    // Perform action
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "modifiedAt",
      previousValue: designDoc.data().modifiedAt,
    });
    await designRef.update({ modifiedAt: new Date() });
    updatedDocuments.push({
      collection: "designVersions",
      id: designVersionId,
      field: "images",
      previousValue: currentImages,
    });
    await designVersionRef.update({ images: updatedImages });

    res.status(200).json({
      success: true,
      message: "SAM masks updated successfully",
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error updating SAM masks:", error);
    // Rollback updates
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
      } catch (rollbackError) {
        console.error(`Rollback failed for ${doc.collection}/${doc.id}:`, rollbackError);
      }
    }
    res.status(500).json({ error: "Failed to update SAM masks" });
  }
};

// Update Design Version Combined Mask
exports.updateDesignVersionCombinedMask = async (req, res) => {
  const updatedDocuments = [];
  try {
    const { designId, designVersionId } = req.params;
    const { userId, designVersionImageId, combinedMask } = req.body;

    // Check user role in design
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }
    const allowAction = isOwnerEditorDesign(designDoc, userId);
    if (!allowAction) {
      return res
        .status(403)
        .json({ error: "User does not have permission to create design version" });
    }

    // Get current images array
    const designVersionRef = db.collection("designVersions").doc(designVersionId);
    const designVersionDoc = await designVersionRef.get();
    const currentImages = designVersionDoc.data().images;
    const imageIndex = currentImages.findIndex((img) => img.imageId === designVersionImageId);

    // Upload samMaskImage
    const maskImageName = `combined_mask_${Date.now()}.png`;
    const maskImagePath = `designs/${designId}/versions/${designVersionId}/${designVersionImageId}/masks/${maskImageName}`;
    const maskImageRef = ref(storage, maskImagePath);
    const maskImageResponse = await axios.get(combinedMask.samMaskImage, {
      responseType: "arraybuffer",
    });
    await uploadBytes(maskImageRef, Buffer.from(maskImageResponse.data), {
      contentType: "image/png",
    });
    const maskImageURL = await getDownloadURL(maskImageRef);

    // Upload samMaskMask
    const maskMaskName = `combined_masked_${Date.now()}.png`;
    const maskMaskPath = `designs/${designId}/versions/${designVersionId}/${designVersionImageId}/masks/${maskMaskName}`;
    const maskMaskRef = ref(storage, maskMaskPath);
    const maskMaskResponse = await axios.get(combinedMask.samMaskMask, {
      responseType: "arraybuffer",
    });
    await uploadBytes(maskMaskRef, Buffer.from(maskMaskResponse.data), {
      contentType: "image/png",
    });
    const maskMaskURL = await getDownloadURL(maskMaskRef);

    // Update the specific image's combined mask in the images array
    const updatedImages = [...currentImages];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      masks: {
        ...updatedImages[imageIndex].masks,
        combinedMask: {
          samMaskImage: maskImageURL,
          samMaskMask: maskMaskURL,
        },
      },
    };

    // Perform action
    updatedDocuments.push({
      collection: "designs",
      id: designId,
      field: "modifiedAt",
      previousValue: designDoc.data().modifiedAt,
    });
    await designRef.update({ modifiedAt: new Date() });
    updatedDocuments.push({
      collection: "designVersions",
      id: designVersionId,
      field: "images",
      previousValue: currentImages,
    });
    await designVersionRef.update({ images: updatedImages });

    res.status(200).json({
      success: true,
      message: "Combined mask updated successfully",
      images: updatedImages,
    });
  } catch (error) {
    console.error("Error updating combined mask:", error);
    // Rollback updates
    for (const doc of updatedDocuments) {
      try {
        await db
          .collection(doc.collection)
          .doc(doc.id)
          .update({
            [doc.field]: doc.previousValue,
          });
      } catch (rollbackError) {
        console.error(`Rollback failed for ${doc.collection}/${doc.id}:`, rollbackError);
      }
    }
    res.status(500).json({ error: "Failed to update combined mask" });
  }
};

// Move design to trash
exports.moveDesignToTrash = async (req, res) => {
  const batch = db.batch();
  const previousStates = [];

  try {
    const { designId } = req.params;
    const { userId } = req.body;

    // Get design document
    const designRef = db.collection("designs").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Design not found" });
    }

    // Check user role in design
    const allowAction = isOwnerDesign(designDoc, userId);
    if (!allowAction) {
      return res.status(403).json({ error: "User does not have permission to delete design" });
    }

    const designData = designDoc.data();
    // Store original state
    previousStates.push({
      ref: designRef,
      data: designData,
      type: "design",
    });

    // Create document in deletedDesigns with same ID
    const deletedDesignRef = db.collection("deletedDesigns").doc(designId);
    const deletedDesignData = {
      ...designData,
      modifiedAt: new Date(),
      deletedAt: new Date(),
    };
    batch.set(deletedDesignRef, deletedDesignData);

    // Get all collaborators (owner, editors, commenters, viewers)
    const collaborators = new Set([
      designData.owner,
      ...(designData.editors || []),
      ...(designData.commenters || []),
      ...(designData.viewers || []),
    ]);

    // Update each collaborator's document
    for (const collaboratorId of collaborators) {
      const userRef = db.collection("users").doc(collaboratorId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        previousStates.push({
          ref: userRef,
          data: userData,
          type: "user",
        });

        // Update user's arrays
        const updatedDesigns = (userData.designs || []).filter(
          (design) => design.designId !== designId
        );
        const updatedDeletedDesigns = [...(userData.deletedDesigns || []), designId];

        batch.update(userRef, {
          designs: updatedDesigns,
          deletedDesigns: updatedDeletedDesigns,
        });
      }
    }

    // Delete original design
    batch.delete(designRef);

    // Commit all changes
    await batch.commit();

    res.status(200).json({
      success: true,
      message: "Design moved to trash successfully",
    });
  } catch (error) {
    console.error("Error moving design to trash:", error);

    // Rollback using previous states
    try {
      const rollbackBatch = db.batch();
      for (const state of previousStates) {
        if (state.type === "design") {
          rollbackBatch.set(state.ref, state.data);
        } else if (state.type === "user") {
          rollbackBatch.update(state.ref, state.data);
        }
      }
      await rollbackBatch.commit();
      console.log("Rollback completed successfully");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.meessage);
    }

    res.status(500).json({ error: "Failed to move design to trash" });
  }
};

// Restore design from trash
exports.restoreDesignFromTrash = async (req, res) => {
  const batch = db.batch();
  const previousStates = [];

  try {
    const { designId } = req.params;
    const { userId } = req.body;

    // Get deleted design document
    const deletedDesignRef = db.collection("deletedDesigns").doc(designId);
    const deletedDesignDoc = await deletedDesignRef.get();
    if (!deletedDesignDoc.exists) {
      return res.status(404).json({ error: "Deleted design not found" });
    }

    // Check user role in design
    const allowAction = isOwnerEditorDesign(deletedDesignDoc, userId);
    if (!allowAction) {
      return res.status(403).json({ error: "User does not have permission to restore design" });
    }

    const designData = deletedDesignDoc.data();
    // Store original state
    previousStates.push({
      ref: deletedDesignRef,
      data: designData,
      type: "deletedDesign",
    });

    // Create document in designs collection with same ID
    const designRef = db.collection("designs").doc(designId);
    const restoredDesignData = {
      ...designData,
      deletedAt: null,
      modifiedAt: new Date(),
    };
    batch.set(designRef, restoredDesignData);

    // Get all collaborators (owner, editors, commenters, viewers)
    const collaborators = new Set([
      designData.owner,
      ...(designData.editors || []),
      ...(designData.commenters || []),
      ...(designData.viewers || []),
    ]);

    // Update each collaborator's document
    for (const collaboratorId of collaborators) {
      const userRef = db.collection("users").doc(collaboratorId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        previousStates.push({
          ref: userRef,
          data: userData,
          type: "user",
        });

        // Update user's arrays
        const updatedDeletedDesigns = (userData.deletedDesigns || []).filter(
          (id) => id !== designId
        );

        // Determine user's role in the design
        let role = 0; // default viewer
        if (collaboratorId === designData.owner) role = 3; // owner
        else if (designData.editors?.includes(collaboratorId)) role = 1; // editor
        else if (designData.commenters?.includes(collaboratorId)) role = 2; // commenter

        const updatedDesigns = [...(userData.designs || []), { designId, role }];

        batch.update(userRef, {
          designs: updatedDesigns,
          deletedDesigns: updatedDeletedDesigns,
        });
      }
    }

    // Delete from deletedDesigns
    batch.delete(deletedDesignRef);

    // Commit all changes
    await batch.commit();

    res.status(200).json({
      success: true,
      message: "Design restored from trash",
    });
  } catch (error) {
    console.error("Error restoring design form trash:", error);

    // Rollback using previous states
    try {
      const rollbackBatch = db.batch();
      for (const state of previousStates) {
        if (state.type === "deletedDesign") {
          rollbackBatch.set(state.ref, state.data);
        } else if (state.type === "user") {
          rollbackBatch.update(state.ref, state.data);
        }
      }
      await rollbackBatch.commit();
      console.log("Rollback completed successfully");
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }

    res.status(500).json({ error: "Failed to restore design from trash" });
  }
};

// Delete Design
exports.deleteDesign = async (req, res) => {
  const deletedDocuments = [];
  const updatedDocuments = [];
  try {
    const { designId } = req.params;
    const { userId } = req.body;

    // Get design data first to check existence
    const designRef = db.collection("deletedDesigns").doc(designId);
    const designDoc = await designRef.get();
    if (!designDoc.exists) {
      return res.status(404).json({ error: "Deleted design not found" });
    }
    const designData = designDoc.data();
    const allowAction = isOwnerDesign(designDoc, userId);
    if (!allowAction) {
      return res.status(403).json({ error: "User does not have permission to delete design" });
    }

    // 1. Update parent documents first (users, projects, designs)
    // Update user's designs array
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const previousDesigns = [...userData.designs];
      const updatedDesigns = previousDesigns.filter((design) => design.designId !== designId);
      updatedDocuments.push({
        ref: userRef,
        field: "designs",
        previousValue: previousDesigns,
        newValue: updatedDesigns,
      });
      await userRef.update({ designs: updatedDesigns });
      console.log(`Successfully updated document: ${userRef.path}, field: designs`);
    }

    // Update projects containing this design
    if (designId) {
      const projectsSnapshot = await db
        .collection("projects")
        .where("designs", "in", [{ designId }])
        .get();

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        const previousDesigns = [...projectData.designs];
        const updatedDesigns = previousDesigns.filter((design) => design.designId !== designId);
        updatedDocuments.push({
          ref: projectDoc.ref,
          field: "designs",
          previousValue: previousDesigns,
          newValue: updatedDesigns,
        });
        await projectDoc.ref.update({ designs: updatedDesigns });
        console.log(`Successfully updated document: ${projectDoc.ref.path}, field: designs`);
      }
    }

    // Delete the design document first as it's also a parent
    deletedDocuments.push({
      ref: designRef,
      data: designData,
    });
    await designRef.delete();
    console.log(`Successfully deleted document: ${designRef.path}`);

    // 2. Handle pins and planMaps
    const pinsSnapshot = await db.collection("pins").where("designId", "==", designId).get();

    const pinIdsToDelete = pinsSnapshot.docs.map((doc) => doc.id);

    // Update planMaps FIRST before deleting pins
    if (pinIdsToDelete && pinIdsToDelete.length > 0) {
      const planMapsSnapshot = await db
        .collection("planMaps")
        .where("pins", "in", pinIdsToDelete)
        .get();

      for (const planMapDoc of planMapsSnapshot.docs) {
        const planMapData = planMapDoc.data();
        const previousPins = [...planMapData.pins];
        const updatedPins = previousPins.filter((pinId) => !pinIdsToDelete.includes(pinId));
        updatedDocuments.push({
          ref: planMapDoc.ref,
          field: "pins",
          previousValue: previousPins,
          newValue: updatedPins,
        });
        await planMapDoc.ref.update({ pins: updatedPins });
        console.log(`Successfully updated document: ${planMapDoc.ref.path}, field: pins`);
      }
    }

    // Then delete pins
    for (const pinDoc of pinsSnapshot.docs) {
      deletedDocuments.push({
        ref: pinDoc.ref,
        data: pinDoc.data(),
      });
      await pinDoc.ref.delete();
      console.log(`Successfully deleted document: ${pinDoc.ref.path}`);
    }

    // 3-4. Delete designVersions, comments, handle budget, projectBudgets
    for (const versionId of designData.history || []) {
      const versionRef = db.collection("designVersions").doc(versionId);
      const versionDoc = await versionRef.get();
      if (versionDoc.exists) {
        const versionData = versionDoc.data();
        deletedDocuments.push({
          ref: versionRef,
          data: versionData,
        });
        await versionRef.delete();
        console.log(`Successfully deleted document: ${versionRef.path}`);

        // Delete comments after design version is deleted
        if (versionData.images) {
          for (const image of versionData.images) {
            const commentsSnapshot = await db
              .collection("comments")
              .where("designVersionImageId", "==", image.imageId)
              .get();

            for (const commentDoc of commentsSnapshot.docs) {
              deletedDocuments.push({
                ref: commentDoc.ref,
                data: commentDoc.data(),
              });
              await commentDoc.ref.delete();
              console.log(`Successfully deleted document: ${commentDoc.ref.path}`);
            }
          }
        }

        // Handle budgets and projectBudgets
        if (versionData.budgetId) {
          const budgetRef = db.collection("budgets").doc(versionData.budgetId);
          const budgetDoc = await budgetRef.get();

          if (budgetDoc.exists) {
            const budgetData = budgetDoc.data();

            // Update projectBudgets FIRST before deleting budget
            if (versionData.budgetId) {
              const projectBudgetsSnapshot = await db
                .collection("projectBudgets")
                .where("budgets", "in", [versionData.budgetId])
                .get();

              for (const projectBudgetDoc of projectBudgetsSnapshot.docs) {
                const projectBudgetData = projectBudgetDoc.data();
                const previousBudgets = [...projectBudgetData.budgets];
                const updatedBudgets = previousBudgets.filter(
                  (budgetId) => budgetId !== versionData.budgetId
                );
                updatedDocuments.push({
                  ref: projectBudgetDoc.ref,
                  field: "budgets",
                  previousValue: previousBudgets,
                  newValue: updatedBudgets,
                });
                await projectBudgetDoc.ref.update({ budgets: updatedBudgets });
                console.log(
                  `Successfully updated document: ${projectBudgetDoc.ref.path}, field: budgets`
                );
              }
            }

            // Delete items after updating projectBudgets
            for (const itemId of budgetData.items || []) {
              const itemRef = db.collection("items").doc(itemId);
              const itemDoc = await itemRef.get();
              if (itemDoc.exists) {
                deletedDocuments.push({
                  ref: itemRef,
                  data: itemDoc.data(),
                });
                await itemRef.delete();
                console.log(`Successfully deleted document: ${itemRef.path}`);
              }
            }

            // Then delete budget
            deletedDocuments.push({
              ref: budgetRef,
              data: budgetData,
            });
            await budgetRef.delete();
            console.log(`Successfully deleted document: ${budgetRef.path}`);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Design and related documents deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteDesign:", error);

    // Rollback updates first
    for (const doc of updatedDocuments) {
      try {
        await doc.ref.update({ [doc.field]: doc.previousValue });
        console.log(`Rolled back update for ${doc.ref.path}, field: ${doc.field}`);
      } catch (rollbackError) {
        console.error(
          `Error rolling back update for ${doc.ref.path}, field: ${doc.field}:`,
          rollbackError.message
        );
      }
    }

    // Then restore deleted documents
    for (const doc of deletedDocuments) {
      try {
        await doc.ref.set(doc.data);
        console.log(`Restored deleted document ${doc.ref.path}`);
      } catch (rollbackError) {
        console.error(`Error restoring document ${doc.ref.path}:`, rollbackError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete design and related documents",
      details: error.message,
    });
  }
};

exports.emptyTrash = async (req, res) => {
  const deletedDocuments = [];
  const updatedDocuments = [];
  const skippedItems = { designs: [], projects: [] };

  try {
    const { userId, toDelete } = req.body;
    console.log("emptyTrash - Starting deletion process for:", toDelete);

    // Delete designs
    if (toDelete.designs && toDelete.designs.length > 0) {
      for (const designId of toDelete.designs) {
        try {
          // Get design data and check permissions
          const designRef = db.collection("deletedDesigns").doc(designId);
          const designDoc = await designRef.get();

          if (!designDoc.exists) {
            skippedItems.designs.push({ id: designId, reason: "not found" });
            continue;
          }

          const designData = designDoc.data();
          const allowAction = isOwnerDesign(designDoc, userId);
          if (!allowAction) {
            skippedItems.designs.push({ id: designId, reason: "no permission" });
            continue;
          }

          // 1. Update parent documents (users, projects)
          // Update user's designs array
          const userRef = db.collection("users").doc(userId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const previousDesigns = [...userData.designs];
            const updatedDesigns = previousDesigns.filter((design) => design.designId !== designId);
            updatedDocuments.push({
              ref: userRef,
              field: "designs",
              previousValue: previousDesigns,
              newValue: updatedDesigns,
            });
            await userRef.update({ designs: updatedDesigns });
          }

          // Update projects containing this design
          if (designId) {
            const projectsSnapshot = await db
              .collection("projects")
              .where("designs", "in", [{ designId }])
              .get();

            for (const projectDoc of projectsSnapshot.docs) {
              const projectData = projectDoc.data();
              const previousDesigns = [...projectData.designs];
              const updatedDesigns = previousDesigns.filter(
                (design) => design.designId !== designId
              );
              updatedDocuments.push({
                ref: projectDoc.ref,
                field: "designs",
                previousValue: previousDesigns,
                newValue: updatedDesigns,
              });
              await projectDoc.ref.update({ designs: updatedDesigns });
            }
          }

          // Store design for deletion
          deletedDocuments.push({
            ref: designRef,
            data: designData,
          });

          // 2. Handle pins and planMaps
          const pinsSnapshot = await db.collection("pins").where("designId", "==", designId).get();

          const pinIdsToDelete = pinsSnapshot.docs.map((doc) => doc.id);

          // Update planMaps before deleting pins
          if (pinIdsToDelete && pinIdsToDelete.length > 0) {
            const planMapsSnapshot = await db
              .collection("planMaps")
              .where("pins", "in", pinIdsToDelete)
              .get();

            for (const planMapDoc of planMapsSnapshot.docs) {
              const planMapData = planMapDoc.data();
              const previousPins = [...planMapData.pins];
              const updatedPins = previousPins.filter((pinId) => !pinIdsToDelete.includes(pinId));
              updatedDocuments.push({
                ref: planMapDoc.ref,
                field: "pins",
                previousValue: previousPins,
                newValue: updatedPins,
              });
              await planMapDoc.ref.update({ pins: updatedPins });
            }
          }

          // Store pins for deletion
          for (const pinDoc of pinsSnapshot.docs) {
            deletedDocuments.push({
              ref: pinDoc.ref,
              data: pinDoc.data(),
            });
          }

          // 3-4. Handle designVersions, comments, budgets, projectBudgets
          for (const versionId of designData.history || []) {
            const versionRef = db.collection("designVersions").doc(versionId);
            const versionDoc = await versionRef.get();

            if (versionDoc.exists) {
              const versionData = versionDoc.data();
              deletedDocuments.push({
                ref: versionRef,
                data: versionData,
              });

              // Store comments for deletion
              if (versionData.images) {
                for (const image of versionData.images) {
                  const commentsSnapshot = await db
                    .collection("comments")
                    .where("designVersionImageId", "==", image.imageId)
                    .get();

                  for (const commentDoc of commentsSnapshot.docs) {
                    deletedDocuments.push({
                      ref: commentDoc.ref,
                      data: commentDoc.data(),
                    });
                  }
                }
              }

              // Handle budgets and projectBudgets
              if (versionData.budgetId) {
                const budgetRef = db.collection("budgets").doc(versionData.budgetId);
                const budgetDoc = await budgetRef.get();

                if (budgetDoc.exists) {
                  const budgetData = budgetDoc.data();

                  // Update projectBudgets before deleting budget
                  const projectBudgetsSnapshot = await db
                    .collection("projectBudgets")
                    .where("budgets", "in", [versionData.budgetId])
                    .get();

                  for (const projectBudgetDoc of projectBudgetsSnapshot.docs) {
                    const projectBudgetData = projectBudgetDoc.data();
                    const previousBudgets = [...projectBudgetData.budgets];
                    const updatedBudgets = previousBudgets.filter(
                      (budgetId) => budgetId !== versionData.budgetId
                    );
                    updatedDocuments.push({
                      ref: projectBudgetDoc.ref,
                      field: "budgets",
                      previousValue: previousBudgets,
                      newValue: updatedBudgets,
                    });
                    await projectBudgetDoc.ref.update({ budgets: updatedBudgets });
                  }

                  // Store items for deletion
                  for (const itemId of budgetData.items || []) {
                    const itemRef = db.collection("items").doc(itemId);
                    const itemDoc = await itemRef.get();
                    if (itemDoc.exists) {
                      deletedDocuments.push({
                        ref: itemRef,
                        data: itemDoc.data(),
                      });
                    }
                  }

                  // Store budget for deletion
                  deletedDocuments.push({
                    ref: budgetRef,
                    data: budgetData,
                  });
                }
              }
            }
          }

          // Execute all deletions
          await Promise.all([
            ...deletedDocuments.map((doc) => doc.ref.delete()),
            designRef.delete(),
          ]);
        } catch (error) {
          console.error(`Error processing design ${designId}:`, error);
          skippedItems.designs.push({ id: designId, reason: "error", error: error.message });
          continue;
        }
      }
    }

    // Delete projects
    if (toDelete.projects && toDelete.projects.length > 0) {
      for (const projectId of toDelete.projects) {
        try {
          // Get project data and check permissions
          const projectRef = db.collection("deletedProjects").doc(projectId);
          const projectDoc = await projectRef.get();

          if (!projectDoc.exists) {
            skippedItems.projects.push({ id: projectId, reason: "not found" });
            continue;
          }

          const projectData = projectDoc.data();
          const allowAction = isManagerProject(projectDoc, userId);
          if (!allowAction) {
            skippedItems.projects.push({ id: projectId, reason: "no permission" });
            continue;
          }

          // 1. Update parent documents (users, designs)
          // Update user's projects array
          const userRef = db.collection("users").doc(userId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const previousProjects = [...userData.projects];
            const updatedProjects = previousProjects.filter(
              (project) => project.projectId !== projectId
            );
            updatedDocuments.push({
              ref: userRef,
              field: "projects",
              previousValue: previousProjects,
              newValue: updatedProjects,
            });
            await userRef.update({ projects: updatedProjects });
          }

          // Update designs that reference this project
          const designsWithProject = await db
            .collection("designs")
            .where("projectId", "==", projectId)
            .get();

          for (const designDoc of designsWithProject.docs) {
            const previousData = designDoc.data();
            updatedDocuments.push({
              ref: designDoc.ref,
              field: "projectId",
              previousValue: previousData.projectId,
              newValue: null,
            });
            await designDoc.ref.update({ projectId: null });
          }

          // Store project for deletion
          deletedDocuments.push({
            ref: projectRef,
            data: projectData,
          });

          // 2. Handle associated documents
          // Store projectBudget for deletion
          if (projectData.projectBudgetId) {
            const projectBudgetRef = db
              .collection("projectBudgets")
              .doc(projectData.projectBudgetId);
            const projectBudgetDoc = await projectBudgetRef.get();
            if (projectBudgetDoc.exists) {
              deletedDocuments.push({
                ref: projectBudgetRef,
                data: projectBudgetDoc.data(),
              });
            }
          }

          // Handle planMap and pins
          if (projectData.planMapId) {
            const planMapRef = db.collection("planMaps").doc(projectData.planMapId);
            const planMapDoc = await planMapRef.get();
            if (planMapDoc.exists) {
              const planMapData = planMapDoc.data();
              deletedDocuments.push({
                ref: planMapRef,
                data: planMapData,
              });

              // Store pins for deletion
              for (const pinId of planMapData.pins || []) {
                const pinRef = db.collection("pins").doc(pinId);
                const pinDoc = await pinRef.get();
                if (pinDoc.exists) {
                  deletedDocuments.push({
                    ref: pinRef,
                    data: pinDoc.data(),
                  });
                }
              }
            }
          }

          // Handle timeline and events
          if (projectData.timelineId) {
            const timelineRef = db.collection("timelines").doc(projectData.timelineId);
            const timelineDoc = await timelineRef.get();
            if (timelineDoc.exists) {
              const timelineData = timelineDoc.data();
              deletedDocuments.push({
                ref: timelineRef,
                data: timelineData,
              });

              // Store events for deletion
              for (const eventId of timelineData.events || []) {
                const eventRef = db.collection("events").doc(eventId);
                const eventDoc = await eventRef.get();
                if (eventDoc.exists) {
                  deletedDocuments.push({
                    ref: eventRef,
                    data: eventDoc.data(),
                  });
                }
              }
            }
          }

          // Execute all deletions
          await Promise.all([
            ...deletedDocuments.map((doc) => doc.ref.delete()),
            projectRef.delete(),
          ]);
        } catch (error) {
          console.error(`Error processing project ${projectId}:`, error);
          skippedItems.projects.push({ id: projectId, reason: "error", error: error.message });
          continue;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Trash emptied successfully",
      skippedItems,
    });
  } catch (error) {
    console.error("Error emptying trash:", error);

    // Rollback updates
    for (const doc of updatedDocuments) {
      try {
        await doc.ref.update({ [doc.field]: doc.previousValue });
      } catch (rollbackError) {
        console.error(`Error rolling back update for ${doc.ref.path}:`, rollbackError);
      }
    }

    // Restore deleted documents
    for (const doc of deletedDocuments) {
      try {
        await doc.ref.set(doc.data);
      } catch (restoreError) {
        console.error(`Error restoring document ${doc.ref.path}:`, restoreError);
      }
    }

    res.status(500).json({
      success: false,
      error: "Failed to empty trash",
      details: error.message,
      skippedItems,
    });
  }
};

exports.updateDesignProjectId = async (req, res) => {
  try {
    const { designId } = req.params;
    const { projectId } = req.body;

    const designRef = db.collection("designs").doc(designId);
    await designRef.update({ projectId, modifiedAt: new Date() });

    res.status(200).json({ message: "Design projectId updated successfully" });
  } catch (error) {
    console.error("Error updating design projectId:", error);
    res.status(500).json({ message: "Failed to update design projectId" });
  }
};
