// Import images from your assets folder
import d1 from "../assets/images/d1.png";
import d2 from "../assets/images/d2.png";
import d3 from "../assets/images/d3.png";

// Export 3 mock products
export const products = [
  {
    id: "PROD-001",
    name: "Chicken Biryani",
    price: 220,
    description: "Aromatic & spicy",
    image: d1,
    available: true,
  },
  {
    id: "PROD-002",
    name: "Paneer Butter Masala",
    price: 180,
    description: "Creamy & delicious",
    image: d2,
    available: true,
  },
  {
    id: "PROD-003",
    name: "Veg Noodles",
    price: 150,
    description: "Stir-fried with veggies",
    image: d3,
    available: true,
  },
];
