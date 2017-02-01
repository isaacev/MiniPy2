# MiniPy2
A parser & runtime for a subset of Python runnable from the browser.

This project aims to be a re-implementation of [MiniPy](http://isaacev.github.io/MiniPy/) which I built in the fall of 2014. This library is meant to easily plug into a debugging environment that is pause-able and so the runtime has an API for incrementally stepping through a program's execution. The original version of this used a tree-walking interpreter to run the programs and ultimately was too complex. This versino of the library translates Python source code into a very high level "bytecode" that can be more easily debugged and stepped through.


