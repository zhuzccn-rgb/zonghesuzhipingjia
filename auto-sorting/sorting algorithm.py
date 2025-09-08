class SortingAlgorithm:
    def __init__(self):
        self.list = []
        self.questiondictionary = {"questions":"","difficultylevel":"","category":""}
        self.easy_list = []
        self.medium_list = []
        self.hard_list = []
        self.categorydictionary = {
         "定语从句":1,
         "主语从句":2,
         "单词":3,
         "状语从句":4
        }
        self.category_list = []



    def sort_dictionary(self, input_dict):
        for key, value in input_dict.items():
            if key == "difficultylevel":
                if value == "1":
                    self.easy_list.append(input_dict["questions"])
                elif value == "2":
                    self.medium_list.append(input_dict["questions"])
                elif value == "3":
                    self.hard_list.append(input_dict["questions"])
        return self.easy_list, self.medium_list, self.hard_list
    
    def sort_category(self, input_dict):
        for key, value in input_dict.items():
            if key == "category":
                if value == "1":
                    self.category_list.append("定语从句")
                elif value == "2":
                    self.category_list.append("主语从句")
                elif value == "3":
                    self.category_list.append("单词")
                elif value == "4":
                    self.category_list.append("状语从句")
        return self.category_list
print("请输入问题，难度等级，类别")
questions = input("请输入问题: ")
difficultylevel = input("请输入难度等级 (1-3): ")
category = input("请输入类别 (1-4): ")
inputdictionary = {"questions": questions, "difficultylevel": difficultylevel, "category": category}
sorter = SortingAlgorithm()
sorter.sort_dictionary(inputdictionary)
sorter.sort_category(inputdictionary)
print("Easy List: ", sorter.easy_list)
print("Medium List: ", sorter.medium_list)
print("Hard List: ", sorter.hard_list)
print("Category List: ", sorter.category_list)