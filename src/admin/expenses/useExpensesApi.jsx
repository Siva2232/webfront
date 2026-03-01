import { useState, useEffect } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";

// category should be one of purchase, utility, direct, indirect
export function useExpensesApi(category) {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = async () => {
    if (!category) return;
    try {
      setIsLoading(true);
      const { data } = await API.get("/expenses", { params: { category } });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching expenses", err);
    } finally {
      setIsLoading(false);
    }
  };

  const add = async (item) => {
    if (!category) throw new Error("Category required");
    try {
      const payload = { ...item, category };
      const { data } = await API.post("/expenses", payload);
      setList((prev) => [data, ...prev]);
      toast.success("Added");
      return data;
    } catch (err) {
      console.error("Error adding expense", err);
      toast.error("Failed to add expense");
      throw err;
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/expenses/${id}`);
      setList((prev) => prev.filter((e) => e._id !== id && e.id !== id));
      toast.success("Deleted");
    } catch (err) {
      console.error("Error deleting expense", err);
      toast.error("Failed to delete expense");
    }
  };

  useEffect(() => {
    fetch();
  }, [category]);

  return { list, isLoading, fetch, add, remove };
}
