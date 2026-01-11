#!/bin/bash

# VIBE CLI Bash Autocomplete

_vibe_completions() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  opts="--help --version --mode --config --status --clear --exit --providers --models --use --model --memory --modules --tools --approve --sandbox --checkpoint --undo --risk --autoapprove"

  case "${prev}" in
    --mode)
      COMPREPLY=( $(compgen -W "agent code ask debug" -- ${cur}) )
      return 0
      ;;
    /mode)
      COMPREPLY=( $(compgen -W "agent code ask debug" -- ${cur}) )
      return 0
      ;;
    --use | /use)
      # Dynamic provider list could be fetched here
      COMPREPLY=( $(compgen -W "anthropic openai google ollama" -- ${cur}) )
      return 0
      ;;
  esac

  if [[ ${cur} == /* ]]; then
    COMPREPLY=( $(compgen -W "${opts//--/}" -- ${cur}) )
  else
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
  fi
}

complete -F _vibe_completions vibe
