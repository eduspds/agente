import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginForm) => login(data)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">LeadWatch</h1>
          <p className="text-slate-400 mt-1">Inteligência de Vendas</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">E-mail</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              placeholder="seu@email.com"
            />
            {errors.email ? (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Senha</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
            {errors.password ? (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-red-400 text-sm text-center">
              Credenciais inválidas. Tente novamente.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          admin@leadwatch.com / Admin@123
        </p>
      </div>
    </div>
  )
}
