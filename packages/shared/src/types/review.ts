// Review and Q&A types
export interface Review {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // 1-5
  title: string | null;
  content: string | null;
  instructorReply: string | null;
  instructorRepliedAt: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  userId: string;
  courseId: string;
  lectureId: string | null;
  title: string;
  content: string;
  isAnswered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  content: string;
  isInstructorAnswer: boolean;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Review input
export interface CreateReviewInput {
  courseId: string;
  rating: number;
  title?: string;
  content?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
}

// Q&A input
export interface CreateQuestionInput {
  courseId: string;
  lectureId?: string;
  title: string;
  content: string;
}

export interface CreateAnswerInput {
  questionId: string;
  content: string;
}

// Review with user info for display
export interface ReviewWithUser extends Review {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface QuestionWithAnswers extends Question {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  answers: AnswerWithUser[];
  answersCount: number;
}

export interface AnswerWithUser extends Answer {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}
