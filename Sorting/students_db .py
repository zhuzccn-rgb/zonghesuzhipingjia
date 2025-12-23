students_db = {}
import csv
import random
def add_student(student_id, name, grade, class_name):
    """添加学生基本信息"""
    students_db[student_id] = {
        'name': name,
        'grade': grade,
        'class': class_name,
        'knowledge_points': {}
    }
    def add_knowledge_point(student_id, point_name, mastery_level):
        if student_id in students_db:
         students_db[student_id]['knowledge_points'][point_name] = mastery_level
        else:
           return(f'学生ID'[student_id]'不存在')
