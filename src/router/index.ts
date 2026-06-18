import { createRouter, createWebHistory } from 'vue-router'
import PollList from '@/pages/PollList.vue'
import PollCreate from '@/pages/PollCreate.vue'
import PollEdit from '@/pages/PollEdit.vue'
import PollVote from '@/pages/PollVote.vue'
import PollResult from '@/pages/PollResult.vue'
import PasswordVerify from '@/pages/PasswordVerify.vue'

const routes = [
  { path: '/', name: 'PollList', component: PollList },
  { path: '/create', name: 'PollCreate', component: PollCreate },
  { path: '/edit/:id', name: 'PollEdit', component: PollEdit },
  { path: '/poll/:id', name: 'PollVote', component: PollVote },
  { path: '/result/:id', name: 'PollResult', component: PollResult },
  { path: '/verify/:id', name: 'PasswordVerify', component: PasswordVerify },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
