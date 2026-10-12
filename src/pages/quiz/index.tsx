import {Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useCallback, useEffect, useState} from 'react'
import {getQuizQuestions, submitQuizResult} from '@/db/api'
import type {QuizQuestion} from '@/db/types'

export default function Quiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Array<{id: string; is_correct: boolean; points: number}>>([])
  const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'result'>('loading')
  const [_submitting, setSubmitting] = useState(false)
  const [totalPointsEarned, setTotalPointsEarned] = useState(0)

  const loadQuestions = useCallback(async () => {
    setGameState('loading')
    const {data} = await getQuizQuestions(5)
    if (data && data.length > 0) {
      setQuestions(data)
      setGameState('start')
    } else {
      Taro.showToast({title: '暂时没有题目哦', icon: 'none'})
    }
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const handleStart = () => {
    setGameState('playing')
    setCurrentIndex(0)
    setUserAnswers([])
  }

  const handleAnswer = (option: {text: string; is_correct: boolean}) => {
    const question = questions[currentIndex]
    const newUserAnswers = [
      ...userAnswers,
      {
        id: question.id,
        is_correct: option.is_correct,
        points: question.points
      }
    ]
    setUserAnswers(newUserAnswers)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finishGame(newUserAnswers)
    }
  }

  const finishGame = async (answers: typeof userAnswers) => {
    setSubmitting(true)
    const userId = Taro.getStorageSync('userId')
    if (!userId) {
      Taro.showToast({title: '请先登录', icon: 'none'})
      return
    }

    const {success, pointsEarned} = await submitQuizResult(userId, answers)
    if (success) {
      setTotalPointsEarned(pointsEarned || 0)
      setGameState('result')
    } else {
      Taro.showToast({title: '提交失败', icon: 'none'})
    }
    setSubmitting(false)
  }

  if (gameState === 'loading') {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle">
        <View className="i-mdi-loading animate-spin text-4xl text-primary" />
        <Text className="mt-4 text-muted-foreground">正在加载题目...</Text>
      </View>
    )
  }

  if (gameState === 'start') {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle p-6">
        <View className="bg-card rounded-3xl p-8 shadow-elegant border border-border flex flex-col items-center w-full max-w-sm">
          <Image
            src="https://miaoda-conversation-file.cdn.bcebos.com/user-9dln90bnr0u8/conv-9dlnarhqk45c/20260402/file-aoofptzd4ikg.png@w_1139"
            className="w-40 h-40 mb-6"
            mode="aspectFit"
          />
          <Text className="text-3xl font-black text-foreground mb-4">根宝知识问答</Text>
          <Text className="text-lg text-muted-foreground text-center mb-10 leading-relaxed">
            挑战根书文化知识，赢取会员积分！ 每组5题，答对越多积分越高哦。
          </Text>
          <button
            type="button"
            className="w-full bg-gradient-primary text-white rounded-full py-4 text-xl font-bold flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            onClick={handleStart}>
            开始挑战
          </button>
        </View>
      </View>
    )
  }

  if (gameState === 'playing') {
    const question = questions[currentIndex]
    return (
      <View className="min-h-screen bg-gradient-subtle p-6 flex flex-col">
        <View className="flex justify-between items-center mb-8">
          <View className="bg-primary/10 px-4 py-2 rounded-full">
            <Text className="text-primary font-bold">
              题目 {currentIndex + 1} / {questions.length}
            </Text>
          </View>
          <View className="bg-amber-100 px-4 py-2 rounded-full">
            <Text className="text-amber-700 font-bold">
              {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
            </Text>
          </View>
        </View>

        <View className="bg-card rounded-3xl p-8 shadow-elegant border border-border flex-1 flex flex-col">
          <Text className="text-2xl font-black text-foreground mb-10 leading-tight">{question.question}</Text>

          <View className="space-y-4 flex-1">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full bg-muted/30 hover:bg-primary/10 border-2 border-transparent hover:border-primary rounded-2xl py-5 px-6 text-left flex items-center justify-between group transition-all"
                onClick={() => handleAnswer(option)}>
                <Text className="text-xl font-medium text-foreground group-hover:text-primary">{option.text}</Text>
                <View className="i-mdi-chevron-right text-2xl text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
          </View>
        </View>
      </View>
    )
  }

  if (gameState === 'result') {
    const correctCount = userAnswers.filter((a) => a.is_correct).length
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle p-6">
        <View className="bg-card rounded-3xl p-8 shadow-elegant border border-border flex flex-col items-center w-full max-w-sm">
          <View
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${correctCount > 0 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
            <View className={correctCount > 0 ? 'i-mdi-trophy text-5xl' : 'i-mdi-alert-circle text-5xl'} />
          </View>

          <Text className="text-3xl font-black text-foreground mb-2">挑战完成！</Text>
          <Text className="text-lg text-muted-foreground mb-8">
            答对 {correctCount} / {questions.length} 题
          </Text>

          <View className="bg-amber-50 rounded-2xl p-6 w-full mb-10 text-center border border-amber-100">
            <Text className="text-amber-800 text-lg font-bold block mb-2">本次获得积分</Text>
            <Text className="text-5xl font-black text-amber-600">+{totalPointsEarned}</Text>
          </View>

          <View className="flex flex-col gap-4 w-full">
            <button
              type="button"
              className="w-full bg-gradient-primary text-white rounded-full py-4 text-xl font-bold active:scale-95 transition-transform"
              onClick={loadQuestions}>
              再来一次
            </button>
            <button
              type="button"
              className="w-full bg-muted text-foreground rounded-full py-4 text-xl font-bold active:scale-95 transition-transform"
              onClick={() => Taro.navigateBack()}>
              返回中心
            </button>
          </View>
        </View>
      </View>
    )
  }

  return null
}
