export const getDefaultProduct = (): any => {
  return {
    name: "",
    nameEN: "",
    description: "",
    descriptionEN: "",
    price: 0,
    cost: 0,
    dow: ["all"],
    pictures: [],
    order: 1,
    status: 1,
    featured: false,
    stock: {
      enabled: false,
      quantity: 0,
      outofstockMessage: "",
      outofstockMessageEN: ""
    },
    attributes: [],
    combinations: [],
    taxRate: 13
  };
} 