const { db } = require("../firebaseConfig");

// Create Budget
exports.createBudget = async (req, res) => {
  try {
    const { projectId, name, totalAmount } = req.body;
    const budgetRef = db.collection("budgets").doc();
    const budgetData = {
      projectId,
      name,
      totalAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await budgetRef.set(budgetData);
    res.status(201).json({ id: budgetRef.id, ...budgetData });
  } catch (error) {
    console.error("Error creating budget:", error);
    res.status(500).json({ error: "Failed to create budget" });
  }
};

// Read Budget
exports.getBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const budgetDoc = await db.collection("budgets").doc(budgetId).get();
    if (!budgetDoc.exists) {
      return res.status(404).json({ error: "Budget not found" });
    }
    res.json({ id: budgetDoc.id, ...budgetDoc.data() });
  } catch (error) {
    console.error("Error fetching budget:", error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
};

// Update Budget
exports.updateBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const updateData = req.body;
    updateData.updatedAt = new Date();
    await db.collection("budgets").doc(budgetId).update(updateData);
    res.json({ message: "Budget updated successfully" });
  } catch (error) {
    console.error("Error updating budget:", error);
    res.status(500).json({ error: "Failed to update budget" });
  }
};

// Delete Budget
exports.deleteBudget = async (req, res) => {
  try {
    const { budgetId } = req.params;
    await db.collection("budgets").doc(budgetId).delete();
    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget:", error);
    res.status(500).json({ error: "Failed to delete budget" });
  }
};

// Create Budget Item
exports.createBudgetItem = async (req, res) => {
  try {
    const { budgetId, name, amount } = req.body;
    const itemRef = db.collection("budgets").doc(budgetId).collection("items").doc();
    const itemData = {
      name,
      amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await itemRef.set(itemData);
    res.status(201).json({ id: itemRef.id, ...itemData });
  } catch (error) {
    console.error("Error creating budget item:", error);
    res.status(500).json({ error: "Failed to create budget item" });
  }
};

// Read Budget Items
exports.getBudgetItems = async (req, res) => {
  try {
    const { budgetId } = req.params;
    const itemsSnapshot = await db.collection("budgets").doc(budgetId).collection("items").get();
    const items = itemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    console.error("Error fetching budget items:", error);
    res.status(500).json({ error: "Failed to fetch budget items" });
  }
};

// Update Budget Item
exports.updateBudgetItem = async (req, res) => {
  try {
    const { budgetId, itemId } = req.params;
    const updateData = req.body;
    updateData.updatedAt = new Date();
    await db.collection("budgets").doc(budgetId).collection("items").doc(itemId).update(updateData);
    res.json({ message: "Budget item updated successfully" });
  } catch (error) {
    console.error("Error updating budget item:", error);
    res.status(500).json({ error: "Failed to update budget item" });
  }
};

// Delete Budget Item
exports.deleteBudgetItem = async (req, res) => {
  try {
    const { budgetId, itemId } = req.params;
    await db.collection("budgets").doc(budgetId).collection("items").doc(itemId).delete();
    res.json({ message: "Budget item deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget item:", error);
    res.status(500).json({ error: "Failed to delete budget item" });
  }
};
