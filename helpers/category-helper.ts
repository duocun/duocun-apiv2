import { CategoryInterface } from "../models/category";

export interface TreeNode {
  [key: string]: any;
  children?: Array<TreeNode>;
}

export function traverseTree(treeData: Array<TreeNode> | TreeNode, callback: (treeNode: any) => any) {
  if (Array.isArray(treeData)) {
    treeData.forEach(root => traverseTree(root, callback));
    return;
  }
  callback(treeData);
  if (treeData.children && treeData.children.length) {
    treeData.children.forEach((child: any) => {
      traverseTree(child, callback);
    })
  }
}

export function treefy(data: Array<CategoryInterface>): Array<any> {
  let flatData = [...data];
  const treeData: Array<any> = [];
  const maxCount = flatData.length * flatData.length;
  let count = 0;
  if (flatData.length < 1) {
    return [];
  }
  if (flatData.length === 1) {
    return [
      {
        categoryId: flatData[0]._id?.toString(),
        name: flatData[0].name
      }
    ];
  }
  while(flatData.length && count < maxCount) {
    const processedIndices: Array<number> = [];
    for (let i = 0; i < flatData.length; i++) {
      const currentItem = flatData[i];
      if (!currentItem || !currentItem.parentId) {
        // console.log("parent id not found. appending to root");
        treeData.push({
          categoryId: currentItem?._id?.toString(),
          name: currentItem?.name
        });
        processedIndices.push(i);
      } else {
        // check if parent exists with given parent id
        if (data.find((category: CategoryInterface) => category?._id?.toString() === currentItem?.parentId?.toString())) {
          // console.log("parent exists with id: " + currentItem.parentId);
          traverseTree(treeData, (nodeData: any) => {
            // console.log("traversed node data id: ", nodeData.categoryId);
            // console.log("current item id: ", currentItem.parentId);
            if (nodeData.categoryId === currentItem.parentId?.toString()) {
              // console.log("parent found appending to parent");
              if (!nodeData.children) {
                nodeData.children = [];
              }
              nodeData.children.push({
                categoryId: currentItem._id?.toString(),
                name: currentItem?.name
              });
              processedIndices.push(i);
            }
          });
        } else {
          // console.log("parent does not exists with id: " + flatData[i].parentId);
          // console.log("appending to root");
          treeData.push({
            categoryId: currentItem._id?.toString(),
            name: currentItem?.name
          });
          processedIndices.push(i);
        }
      }
    }
    flatData = flatData.filter((val, idx) => !processedIndices.includes(idx));
    count++;
  }
  if (count >= maxCount) {
    throw new Error("Circular structure");
  }
  return treeData;
}