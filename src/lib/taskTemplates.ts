import type { Difficulty, FamilyMember, IconKey } from "./types";

export interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  icon: IconKey;
  color: FamilyMember["accentColor"];
  points: number;
  difficulty: Difficulty;
}

export const taskTemplates: TaskTemplate[] = [
  { id: "cleaning", title: "Уборка", category: "household", icon: "broom", color: "sky", points: 30, difficulty: "normal" },
  { id: "dishes", title: "Посуда", category: "household", icon: "dishes", color: "sky", points: 20, difficulty: "easy" },
  { id: "vacuum", title: "Пылесос", category: "household", icon: "vacuum", color: "pink", points: 40, difficulty: "normal" },
  { id: "cat", title: "Покормить кота", category: "pet", icon: "cat", color: "pink", points: 20, difficulty: "easy" },
  { id: "homework", title: "Уроки", category: "school", icon: "homework", color: "lilac", points: 50, difficulty: "hard" },
  { id: "shower", title: "Душ", category: "hygiene", icon: "shower", color: "lilac", points: 20, difficulty: "easy" },
  { id: "laundry", title: "Стирка", category: "household", icon: "laundry", color: "sky", points: 30, difficulty: "normal" },
  { id: "trash", title: "Вынести мусор", category: "household", icon: "trash", color: "pink", points: 15, difficulty: "easy" },
  { id: "exercise", title: "Зарядка", category: "health", icon: "exercise", color: "mint", points: 20, difficulty: "easy" },
  { id: "no-gadgets", title: "Вечер без гаджетов", category: "family", icon: "phone-off", color: "coral", points: 80, difficulty: "hard" },
  { id: "early-rise", title: "Ранний подъём", category: "routine", icon: "alarm", color: "yellow", points: 30, difficulty: "normal" },
  { id: "kitchen", title: "Убрать кухню", category: "household", icon: "kitchen", color: "yellow", points: 30, difficulty: "normal" },
  { id: "bedroom", title: "Убрать спальню", category: "household", icon: "bedroom", color: "sky", points: 30, difficulty: "normal" },
  { id: "reading", title: "Чтение", category: "growth", icon: "reading", color: "sky", points: 20, difficulty: "easy" },
  { id: "family-time", title: "Семейное время", category: "family", icon: "heart", color: "coral", points: 40, difficulty: "normal" },
];
