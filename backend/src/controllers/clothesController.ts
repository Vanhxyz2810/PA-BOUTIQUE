import { Request, Response, RequestHandler } from 'express';
import { Clothes } from '../models/Clothes';
import { AppDataSource } from '../config/database';
import fs from 'fs';
import path from 'path';

const clothesRepository = AppDataSource.getRepository(Clothes);

export default {
  getAll: (async (_req, res) => {
    try {
      const clothes = await clothesRepository.find({
        order: { createdAt: 'DESC' }
      });
      res.json(clothes);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  }) as RequestHandler,

  create: (async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng upload ảnh' });
      }

      const clothes = clothesRepository.create({
        name: req.body.name,
        ownerName: req.body.ownerName,
        rentalPrice: Number(req.body.rentalPrice),
        description: req.body.description,
        status: req.body.status || 'available',
        image: `/uploads/${req.file.filename}`
      });

      await clothesRepository.save(clothes);

      res.status(201).json({
        ...clothes,
        image: `http://localhost:5001${clothes.image}`
      });

    } catch (error) {
      console.error('Error creating clothes:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Lỗi khi lưu dữ liệu' });
    }
  }) as RequestHandler,

  update: (async (req, res) => {
    try {
      const clothes = await clothesRepository.findOne({
        where: { id: req.params.id }
      });

      if (!clothes) {
        return res.status(404).json({ message: 'Không tìm thấy' });
      }

      if (req.file) {
        // Xóa ảnh cũ
        const oldImagePath = path.join(__dirname, '../../uploads', path.basename(clothes.image));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      await clothesRepository.update(req.params.id, {
        name: req.body.name,
        ownerName: req.body.ownerName,
        rentalPrice: Number(req.body.rentalPrice),
        description: req.body.description,
        status: req.body.status,
        ...(req.file && { image: `/uploads/${req.file.filename}` })
      });

      const updatedClothes = await clothesRepository.findOne({
        where: { id: req.params.id }
      });

      res.json(updatedClothes);
    } catch (error) {
      res.status(400).json({ message: 'Lỗi khi cập nhật' });
    }
  }) as RequestHandler,

  delete: (async (req, res) => {
    try {
      const clothes = await clothesRepository.findOne({
        where: { id: req.params.id }
      });

      if (!clothes) {
        return res.status(404).json({ message: 'Không tìm thấy' });
      }

      await clothesRepository.remove(clothes);
      res.json({ message: 'Đã xóa thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi khi xóa' });
    }
  }) as RequestHandler,

  getClothesById: (async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log('Getting product with ID:', id);

      if (!id) {
        return res.status(400).json({ message: 'ID không hợp lệ' });
      }

      const clothes = await clothesRepository.findOne({
        where: { id }
      });
      
      if (!clothes) {
        return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
      }

      res.json({
        id: clothes.id,
        name: clothes.name,
        price: clothes.rentalPrice,
        originalPrice: clothes.rentalPrice * 2,
        images: [clothes.image],
        sizes: ['S', 'M', 'L'],
        description: clothes.description || 'Chưa có mô tả',
        sku: `SP${clothes.id}`
      });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  }) as RequestHandler
};