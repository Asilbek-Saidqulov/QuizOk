import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  uz: {
    translation: {
      // Navigation
      nav_home: 'Bosh sahifa',
      nav_discover: 'Kashfiyot',
      nav_join: 'O\'yinga qo\'shiling',
      nav_my_quizzes: 'Mening testlarim',
      nav_create_quiz: 'Test yaratish',
      nav_profile: 'Profil',
      nav_rankings: 'Reyting',
      nav_stats: 'Statistika',
      nav_logout: 'Chiqish',
      
      // Auth
      auth_login: 'Tizimga kirish',
      auth_register: 'Ro\'yxatdan o\'tish',
      auth_email: 'Email',
      auth_password: 'Parol',
      auth_name: 'Ism',
      auth_confirm_password: 'Parolni tasdiqlash',
      auth_already_have_account: 'Hisobingiz bormi?',
      auth_no_account: 'Hisobingiz yo\'qmi?',
      
      // Quiz
      quiz_start: 'Testni boshlash',
      quiz_next: 'Keyingi savol',
      quiz_skip: 'O\'tkazib yuborish',
      quiz_finish: 'Tugatish',
      quiz_correct: 'To\'g\'ri!',
      quiz_incorrect: 'Noto\'g\'ri',
      quiz_complete: 'Test tugadi!',
      quiz_score: 'Ball',
      quiz_accuracy: 'Aniqlik',
      quiz_streak: 'Seriya',
      
      // Common
      common_loading: 'Yuklanmoqda...',
      common_error: 'Xatolik yuz berdi',
      common_retry: 'Qayta urinish',
      common_cancel: 'Bekor qilish',
      common_save: 'Saqlash',
      common_delete: 'O\'chirish',
      common_edit: 'Tahrirlash',
      common_view: 'Ko\'rish',
    },
  },
  en: {
    translation: {
      // Navigation
      nav_home: 'Home',
      nav_discover: 'Discover',
      nav_join: 'Join Game',
      nav_my_quizzes: 'My Quizzes',
      nav_create_quiz: 'Create Quiz',
      nav_profile: 'Profile',
      nav_rankings: 'Rankings',
      nav_stats: 'Statistics',
      nav_logout: 'Logout',
      
      // Auth
      auth_login: 'Login',
      auth_register: 'Register',
      auth_email: 'Email',
      auth_password: 'Password',
      auth_name: 'Name',
      auth_confirm_password: 'Confirm Password',
      auth_already_have_account: 'Already have an account?',
      auth_no_account: "Don't have an account?",
      
      // Quiz
      quiz_start: 'Start Quiz',
      quiz_next: 'Next Question',
      quiz_skip: 'Skip',
      quiz_finish: 'Finish',
      quiz_correct: 'Correct!',
      quiz_incorrect: 'Incorrect',
      quiz_complete: 'Quiz Complete!',
      quiz_score: 'Score',
      quiz_accuracy: 'Accuracy',
      quiz_streak: 'Streak',
      
      // Common
      common_loading: 'Loading...',
      common_error: 'An error occurred',
      common_retry: 'Retry',
      common_cancel: 'Cancel',
      common_save: 'Save',
      common_delete: 'Delete',
      common_edit: 'Edit',
      common_view: 'View',
    },
  },
  ru: {
    translation: {
      // Navigation
      nav_home: 'Главная',
      nav_discover: 'Открыть',
      nav_join: 'Присоединиться',
      nav_my_quizzes: 'Мои викторины',
      nav_create_quiz: 'Создать викторину',
      nav_profile: 'Профиль',
      nav_rankings: 'Рейтинг',
      nav_stats: 'Статистика',
      nav_logout: 'Выйти',
      
      // Auth
      auth_login: 'Войти',
      auth_register: 'Регистрация',
      auth_email: 'Email',
      auth_password: 'Пароль',
      auth_name: 'Имя',
      auth_confirm_password: 'Подтвердите пароль',
      auth_already_have_account: 'Уже есть аккаунт?',
      auth_no_account: 'Нет аккаунта?',
      
      // Quiz
      quiz_start: 'Начать викторину',
      quiz_next: 'Следующий вопрос',
      quiz_skip: 'Пропустить',
      quiz_finish: 'Завершить',
      quiz_correct: 'Верно!',
      quiz_incorrect: 'Неверно',
      quiz_complete: 'Викторина завершена!',
      quiz_score: 'Счет',
      quiz_accuracy: 'Точность',
      quiz_streak: 'Серия',
      
      // Common
      common_loading: 'Загрузка...',
      common_error: 'Произошла ошибка',
      common_retry: 'Повторить',
      common_cancel: 'Отмена',
      common_save: 'Сохранить',
      common_delete: 'Удалить',
      common_edit: 'Редактировать',
      common_view: 'Просмотр',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'uz',
  fallbackLng: 'uz',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
