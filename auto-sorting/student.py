import csv
import random
from collections import defaultdict

# 题目库（根据您的实际题目列表修改）
easy_questions = ["简单题1", "简单题2", "简单题3", "简单题4", "简单题5"]
medium_questions = ["中等题1", "中等题2", "中等题3", "中等题4", "中等题5"]
hard_questions = ["难题1", "难题2", "难题3", "难题4", "难题5"]

# 知识点列表（根据CSV中的列名调整）
KNOWLEDGE_POINTS = ['algebra', 'geometry', 'function', 'physics', 'chemistry']
KNOWLEDGE_POINTS_CN = {'algebra': '代数', 'geometry': '几何', 'function': '函数', 'physics': '物理', 'chemistry': '化学'}

# 学生数据库
students_db = {}
question_usage = defaultdict(int)
MAX_USAGE_PER_QUESTION = 3

def load_students_from_csv(csv_file):
    """从CSV文件加载学生信息"""
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                student_id = row['student_id']
                
                # 创建学生记录
                students_db[student_id] = {
                    'name': row['name'],
                    'grade': row['grade'],
                    'class': row['class'],
                    'knowledge_points': {},
                    'assigned_questions': {}
                }
                
                # 添加知识点掌握程度
                for point in KNOWLEDGE_POINTS:
                    if point in row and row[point].isdigit():
                        students_db[student_id]['knowledge_points'][point] = int(row[point])
                
        print(f"成功加载 {len(students_db)} 名学生信息")
        return True
    except FileNotFoundError:
        print(f"错误: 文件 {csv_file} 未找到")
        return False
    except Exception as e:
        print(f"错误: 读取CSV文件时发生错误 - {e}")
        return False

def get_difficulty_based_on_mastery(mastery_level):
    """根据掌握程度确定题目难度"""
    if mastery_level >= 80:
        return "hard"
    elif mastery_level >= 60:
        return "medium"
    else:
        return "easy"

def assign_questions_to_student(student_id, knowledge_point, num_questions=3):
    """为学生分配特定知识点的题目"""
    if student_id not in students_db:
        return f"学生ID {student_id} 不存在"
    
    if knowledge_point not in students_db[student_id]['knowledge_points']:
        return f"未找到学生 {student_id} 的 {knowledge_point} 知识点记录"
    
    mastery = students_db[student_id]['knowledge_points'][knowledge_point]
    difficulty = get_difficulty_based_on_mastery(mastery)
    
    # 根据难度选择题目列表
    if difficulty == "easy":
        question_pool = easy_questions
    elif difficulty == "medium":
        question_pool = medium_questions
    else:
        question_pool = hard_questions
    
    # 筛选使用次数较少的题目
    available_questions = [
        q for q in question_pool 
        if question_usage[q] < MAX_USAGE_PER_QUESTION
    ]
    
    # 如果可用题目不足，使用所有题目
    if len(available_questions) < num_questions:
        available_questions = question_pool
    
    # 随机选择题目
    assigned = random.sample(available_questions, min(num_questions, len(available_questions)))
    
    # 更新题目使用计数
    for q in assigned:
        question_usage[q] += 1
    
    # 记录已分配的题目
    if knowledge_point not in students_db[student_id]['assigned_questions']:
        students_db[student_id]['assigned_questions'][knowledge_point] = []
    
    students_db[student_id]['assigned_questions'][knowledge_point].extend(assigned)
    
    return {
        'student_id': student_id,
        'knowledge_point': knowledge_point,
        'mastery': mastery,
        'difficulty': difficulty,
        'questions': assigned
    }

def assign_questions_to_all_students(questions_per_point=2):
    """为所有学生分配题目"""
    results = {}
    for student_id in students_db:
        student_results = assign_questions_for_student(student_id, questions_per_point)
        results[student_id] = student_results
    return results

def assign_questions_for_student(student_id, questions_per_point=2):
    """为单个学生分配所有知识点的题目"""
    if student_id not in students_db:
        return f"学生ID {student_id} 不存在"
    
    results = {}
    student = students_db[student_id]
    
    for point_name in student['knowledge_points'].keys():
        result = assign_questions_to_student(student_id, point_name, questions_per_point)
        results[point_name] = result
    
    return results

def display_student_info(student_id):
    """显示学生信息"""
    if student_id in students_db:
        student = students_db[student_id]
        print(f"学号: {student_id}")
        print(f"姓名: {student['name']}")
        print(f"年级: {student['grade']}")
        print(f"班级: {student['class']}")
        print("知识点掌握情况:")
        for point, mastery in student['knowledge_points'].items():
            cn_name = KNOWLEDGE_POINTS_CN.get(point, point)
            print(f"  {cn_name}: {mastery}%")
    else:
        print(f"学生ID {student_id} 不存在")

def display_assigned_questions(student_id):
    """显示学生已分配的题目"""
    if student_id in students_db:
        student = students_db[student_id]
        print(f"学生 {student['name']} (ID: {student_id}) 的已分配题目:")
        for point, questions in student['assigned_questions'].items():
            cn_name = KNOWLEDGE_POINTS_CN.get(point, point)
            print(f"  {cn_name}: {questions}")
    else:
        print(f"学生ID {student_id} 不存在")

def export_assignments_to_csv(output_file):
    """将题目分配结果导出到CSV文件"""
    try:
        with open(output_file, 'w', encoding='utf-8', newline='') as file:
            writer = csv.writer(file)
            # 写入表头
            writer.writerow(['student_id', 'name', 'knowledge_point', 'mastery', 'difficulty', 'assigned_questions'])
            
            # 写入数据
            for student_id, student_data in students_db.items():
                for point, questions in student_data['assigned_questions'].items():
                    mastery = student_data['knowledge_points'].get(point, 'N/A')
                    difficulty = get_difficulty_based_on_mastery(mastery) if isinstance(mastery, int) else 'N/A'
                    cn_point = KNOWLEDGE_POINTS_CN.get(point, point)
                    
                    writer.writerow([
                        student_id,
                        student_data['name'],
                        cn_point,
                        mastery,
                        difficulty,
                        '; '.join(questions)
                    ])
        
        print(f"题目分配结果已导出到 {output_file}")
        return True
    except Exception as e:
        print(f"导出CSV时发生错误: {e}")
        return False

# 示例使用
if __name__ == "__main__":
    # 1. 从CSV加载学生信息
    csv_file = "students.csv"
    if load_students_from_csv(csv_file):
        # 2. 显示学生信息
        print("\n学生信息:")
        for student_id in students_db:
            display_student_info(student_id)
            print()
        
        # 3. 为所有学生分配题目
        print("为所有学生分配题目...")
        assignments = assign_questions_to_all_students(questions_per_point=2)
        
        # 4. 显示分配结果
        print("\n题目分配结果:")
        for student_id in students_db:
            display_assigned_questions(student_id)
            print()
        
        # 5. 导出结果到CSV
        export_assignments_to_csv("question_assignments.csv")
        
        # 6. 为单个学生额外分配特定知识点题目
        print("为张三额外分配代数题目:")
        result = assign_questions_to_student("S001", "algebra", 3)
        print(f"学生: {result['student_id']}, 知识点: {KNOWLEDGE_POINTS_CN['algebra']}")
        print(f"掌握程度: {result['mastery']}%, 难度: {result['difficulty']}")
        print(f"分配题目: {result['questions']}")