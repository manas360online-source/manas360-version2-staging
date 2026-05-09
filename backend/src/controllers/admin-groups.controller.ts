import { Request, Response } from 'express';
import { prisma as db } from '../config/db';

export const listGroupCategoriesController = async (req: Request, res: Response) => {
  try {
    const categories = await db.groupCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroupCategoryController = async (req: Request, res: Response) => {
  const { name, type, max_capacity, session_price, is_active, description } = req.body;
  try {
    const category = await db.groupCategory.create({
      data: {
        name,
        type,
        maxCapacity: max_capacity || 15,
        sessionPrice: session_price,
        isActive: is_active !== undefined ? is_active : true,
        description
      }
    });
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGroupCategoryController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  
  // Map snake_case to camelCase for Prisma
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.max_capacity !== undefined) updateData.maxCapacity = data.max_capacity;
  if (data.session_price !== undefined) updateData.sessionPrice = data.session_price;
  if (data.is_active !== undefined) updateData.isActive = data.is_active;
  if (data.description !== undefined) updateData.description = data.description;

  try {
    const category = await db.groupCategory.update({
      where: { id },
      data: updateData
    });
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGroupCategoryController = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.groupCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Group category deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
