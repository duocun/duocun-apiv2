import { traverseTree, treefy } from "../../helpers/category-helper";
import { expect } from 'chai';
import * as util from "util";

describe("Category helper", () => {
  describe("traverseTree", () => {
    it("should traverse tree nodes and trigger callback function", () => {
    const treeData = [
      {
        name: "root_1",
        children: [
          {
            name: "child_1",
            children: [
              {
                name: "grandchild_1"
              },
              {
                name: "grandchild_2"
              }
            ]
          }
        ]
      },
      {
        name: "root_2",
        children: []
      }
    ];
      const traversingHistory: Array<any> = [];
      const callback = (treeNode: any) => {
        traversingHistory.push(treeNode.name);
      }
      traverseTree(treeData, callback);
      expect(traversingHistory).to.be.eql(["root_1", "child_1", "grandchild_1", "grandchild_2", "root_2"]);
    });
  });
  describe("treefy", () => {
    it("should return array", () => {
      const data = [
        {
          _id: 1,
          name: "Home"
        }
      ];
      // @ts-ignore
      expect(treefy(data)).to.be.eqls([
        {
          categoryId: "1",
          name: "Home"
        }
      ]);
    });
    it("should consider items missing parentId as root nodes", () => {
      const data = [
        {
          _id: 1,
          name: "Home"
        }, 
        {
          _id: 2,
          name: "Food & Drinks"
        }
      ];
      // @ts-ignore
      expect(treefy(data)).to.be.eqls([
        {
          categoryId: "1",
          name: "Home"
        },
        {
          categoryId: "2",
          name: "Food & Drinks"
        }
      ]);
    });
    it("should treefy given categories", () => {
      const data = [
        {
          _id: 1,
          name: "Home"
        },
        {
          _id: 2,
          name: "Food & Drinks",
          parentId: 1
        },
        {
          _id: 3,
          name: "Popcorn",
          parentId: 5
        },
        {
          _id: 4,
          name: "Burger",
          parentId: 2
        },
        {
          _id: 5,
          name: "Yummy"
        },
        {
          _id: 6,
          name: "Missing parent",
          parentId: 7
        }
      ];
      // @ts-ignore
      const tree = treefy(data);
      expect(tree).to.be.eqls([ 
        { categoryId: '1',
          name: 'Home',
          children:
          [ 
            { 
              categoryId: '2',
              name: 'Food & Drinks',
              children: [ 
                { 
                  categoryId: '4', 
                  name: 'Burger' 
                } 
              ] 
            } 
          ] 
        },
        { 
          categoryId: '5',
          name: 'Yummy',
          children: [ 
            { 
              categoryId: '3', 
              name: 'Popcorn' 
            } 
          ] 
        },
        { 
          categoryId: '6', 
          name: 'Missing parent' 
        } 
      ]);
    });
    it("should throw error when circular structure is found", () => {
      const data = [
        {
          _id: 1,
          name: "This",
          parentId: 2
        },
        {
          _id: 2,
          name: "That",
          parentId: 1
        }
      ];
      // @ts-ignore
      expect(() => {treefy(data)}).to.throw("Circular structure");
    });
  });
})