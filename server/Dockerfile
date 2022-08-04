FROM buildpack-deps:bullseye

ENV LANG C.UTF-8
ENV PYTHONUNBUFFERED 1

ENV PYENV_ROOT="${HOME}/.pyenv"
ENV PYENV_GIT_TAG=v2.3.3

RUN curl -L https://github.com/pyenv/pyenv-installer/raw/master/bin/pyenv-installer | bash
ENV PATH="${PYENV_ROOT}/shims:${PYENV_ROOT}/bin:${PATH}"

COPY .python-version .python-version
RUN pyenv install

ENV POETRY_HOME="${HOME}/.poetry"
ENV POETRY_VERSION=1.1.13
RUN curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python -
ENV PATH="${POETRY_HOME}/bin:${PATH}"

COPY pyproject.toml pyproject.toml
RUN poetry config virtualenvs.create false
RUN poetry env use system
RUN poetry install --no-dev --no-root

WORKDIR /app

EXPOSE 8000
