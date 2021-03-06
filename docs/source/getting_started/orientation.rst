Orientation
===========

.. TODO(yannick)
   Pretty much this entire section

Orchest concepts
----------------

.. * Build on top of filesystem and what that means for interactive runs and experiments (this will
..   copy the filesystem, read more in ... link)
.. * Environments
.. * Pipelines

Coming soon!

How Orchest works
-----------------

The shell script ``orchest`` will mount the Docker socket to the ``orchest-ctl`` container to manage
the local Docker containers necessary for running Orchest. In addition, the Docker socket is
necessary for the dynamic spawning of containers that occurs when running individual pipeline steps.

.. some

Orchest runs as a collection of Docker containers and stores a global configuration file. The
location for this config is ``~/.config/orchest/config.json``.

Orchest is powered by your filesystem. Upon launching, Orchest will mount the content of the
``orchest/userdir/`` directory, where ``orchest/`` is the install directory from GitHub, at
different locations inside the docker containers. In the ``userdir/`` on the host machine Orchest
will store its state and user scripts. Your scripts that make up the pipeline, for example
``.ipynb`` and ``.py`` files, are stored inside the ``userdir/pipelines/`` directory and are mounted
in the container at ``/project-dir``. Additionally the following files will be stored inside the
``.orchest/`` directory at the pipeline level (and thus *for each pipeline*):

* The :ref:`Orchest SDK` stores step outputs in the ``.orchest/data/`` directory to pass data
  between pipeline steps (in the case where :meth:`orchest.transfer.output_to_disk` is used).
* Logs are stored in ``.orchest/logs/`` to show STDOUT output from scripts in the pipeline view.
* An autogenerated ``.orchest/pipeline.json`` file that defines the properties of the pipeline and its
  steps.  This includes: execution order, names, images, etc. Orchest needs this pipeline definition
  file to work.

Giving a directory structure similar to the following:

.. code-block:: bash

    .
    ├── preprocessing.ipynb
    ├── .ipynb_checkpoints/
    ├── .orchest
    │   ├── data/
    │   ├── logs/
    │   └── pipeline.json
    └── model-training.ipynb
