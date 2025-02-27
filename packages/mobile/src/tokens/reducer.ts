import { createAction, createReducer } from '@reduxjs/toolkit'
import BigNumber from 'bignumber.js'
import { RehydrateAction } from 'redux-persist'
import { getRehydratePayload, REHYDRATE } from 'src/redux/persist-helper'

interface BaseToken {
  address: string
  decimals: number
  imageUrl: string
  name: string
  symbol: string
  priceFetchedAt?: number
  // This field is for tokens that are part of the core contracts that allow paying for fees and
  // making transfers with a comment.
  isCoreToken?: boolean
}

// Stored variant stores numbers as strings because BigNumber is not serializable.
export interface StoredTokenBalance extends BaseToken {
  balance: string | null
  usdPrice: string
}

export interface TokenBalance extends BaseToken {
  balance: BigNumber
  usdPrice: BigNumber | null
}

export interface StoredTokenBalances {
  [address: string]: StoredTokenBalance | undefined
}

export interface TokenBalances {
  [address: string]: TokenBalance | undefined
}

export interface State {
  tokenBalances: StoredTokenBalances
  loading: boolean
  error: boolean
  lastSuccessfulFetch?: number
}

export const initialState = {
  tokenBalances: {},
  error: false,
  loading: false,
  lastSuccessfulFetch: 0,
}

const rehydrate = createAction<any>(REHYDRATE)
export const setTokenBalances = createAction<StoredTokenBalances>('TOKENS/SET_TOKEN_BALANCES')
export const fetchTokenBalances = createAction('TOKENS/FETCH_TOKEN_BALANCES')
export const tokenBalanceFetchError = createAction('TOKENS/TOKEN_BALANCES_FETCH_ERROR')

export const reducer = createReducer(initialState, (builder) => {
  builder
    .addCase(rehydrate, (state, action) => {
      // hack to allow rehydrate actions here
      const hydrated = getRehydratePayload((action as unknown) as RehydrateAction, 'tokens')
      return {
        ...state,
        ...hydrated,
      }
    })
    .addCase(setTokenBalances, (state, action) => ({
      ...state,
      tokenBalances: action.payload,
      loading: false,
      error: false,
      lastSuccessfulFetch: Date.now(),
    }))
    .addCase(fetchTokenBalances, (state, action) => ({
      ...state,
      loading: true,
      error: false,
    }))
    .addCase(tokenBalanceFetchError, (state, action) => ({
      ...state,
      loading: false,
      error: true,
    }))
})
