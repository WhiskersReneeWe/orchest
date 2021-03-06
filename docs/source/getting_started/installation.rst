Installation
============

Orchest can be run on Linux, macOS and Windows (using the exact same steps!).

Prerequisites
-------------
* Docker

If you do not yet have Docker installed, please visit https://docs.docker.com/get-docker/.

.. _regular installation:

Linux, macOS and Windows
-------------------------
Simply follow the steps below to install Orchest. For Windows, please read the note at the bottom
first.

.. code-block:: bash

   # Clone the repository and change directory.
   git clone https://github.com/orchest/orchest.git
   cd orchest

   # The update command is used both for installation and updating to
   # the newest release.
   ./orchest update

   # Verify the installation. This should print the help message.
   ./orchest

.. note::

    On Windows, Docker has to be configured to use WSL 2. Make sure to clone Orchest inside the
    Linux environment. For more info and installation steps for Docker with WSL 2 backend, please
    visit https://docs.docker.com/docker-for-windows/wsl/.

Build from source
-----------------
You should expect the build to finish in roughly 25 minutes.

.. code-block:: bash

   # Clone the repository and change directory.
   git clone https://github.com/orchest/orchest.git
   cd orchest

   # Check out the version you would like to build.
   git checkout v0.2.1

   # Build all Docker containers from source (in parallel).
   scripts/build_container.sh

   # Verify the installation. This should print the help message.
   ./orchest

.. warning::

    We recommend building a tagged commit indicating a release. Other commits cannot be considered
    stable.

GPU support
-----------

**Linux** (supported)

For GPU images the host on which Orchest is running is required to have a GPU driver that is
compatible with the CUDA version installed in the image.  Compatible version pairs can be found
`here
<https://docs.nvidia.com/deploy/cuda-compatibility/index.html#binary-compatibility__table-toolkit-driver>`_.

The GPU supported image ``orchest/custom-base-kernel-py-gpu`` includes CUDA Toolkit 10.1. Which
requires the NVIDIA driver on the host to be ``>= 418.39``.

To find out which version of the NVIDIA driver you have installed on your host run ``nvidia-smi``.

``nvidia-smi`` is also available from within the GPU enabled image. Please note that when run from
within the container it reports the CUDA Toolkit version installed on the *host*. To find out the
CUDA Toolkit version installed in the container image run ``cat /usr/local/cuda/version.txt``.

Additionally, we require the ``nvidia-container`` package to make sure Docker is able to provide GPU
enabled containers. Installation of the nvidia-container is done using ``apt-get install
nvidia-container-runtime``.

.. seealso::

    `Docker GPU documentation <https://docs.docker.com/config/containers/resource_constraints/#gpu>`_
        Most up to date instructions on installing Docker with NVIDIA GPU passthrough support.

**Windows WSL 2** (supported)

For WSL 2 follow the `CUDA on WSL User Guide
<https://docs.nvidia.com/cuda/wsl-user-guide/index.html>`_ provided by NVIDIA. 

Please note that the "Docker Desktop WSL 2 backend" (meaning, you've installed Docker not
directly in the WSL 2 environment but on the Windows host itself) does not
support CUDA yet.

**macOS** (not supported)

Unfortunately, ``nvidia-docker`` does not support GPU enabled images on macOS (see `FAQ
<https://github.com/NVIDIA/nvidia-docker/wiki/Frequently-Asked-Questions#is-macos-supported>`_ on
``nvidia-docker``).

Run Orchest on the cloud
------------------------
Running Orchest on a cloud hosted VM (such as EC2) does not require a special installation. Simply follow the
:ref:`regular installation process <regular installation>`.

To enable SSL run ``scripts/letsencrypt-nginx.sh <domain> <email>`` and restart Orchest ``./orchest restart``.

Please refer to the :ref:`authentication section <authentication>` to enable the authentication
server, giving you a login screen requiring a username and password before you can access Orchest.

