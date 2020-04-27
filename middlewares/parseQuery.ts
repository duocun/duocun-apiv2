import { Request, Response } from "express";

export const parseQuery = (req: Request, res: Response, next:any) => {
  const query = req.query;
  if (!query) {
    next();
  }
  if (query.query) {
    // req.context = { ...req.context, query: JSON.parse(<string>query.query)};
    req.query = JSON.parse(<string>query.query);
  }
  next();
}